const url = require('url');
const crypto = require('crypto');
const stream = require('stream');
const AWS = require('aws-sdk');
const cuid = require('cuid');
const error = require('fasterror');
const s3urls = require('s3urls');
const eventStream = require('cfn-stack-event-stream');
const lookup = require('./lookup');

require('colors');

const colors = {
    CREATE_IN_PROGRESS: 'yellow',
    CREATE_FAILED: 'red',
    CREATE_COMPLETE: 'green',
    DELETE_IN_PROGRESS: 'yellow',
    DELETE_FAILED: 'red',
    DELETE_COMPLETE: 'grey',
    DELETE_SKIPPED: 'red',
    UPDATE_IN_PROGRESS: 'yellow',
    UPDATE_COMPLETE_CLEANUP_IN_PROGRESS: 'yellow',
    UPDATE_FAILED: 'red',
    UPDATE_COMPLETE: 'green',
    ROLLBACK_IN_PROGRESS: 'red',
    ROLLBACK_COMPLETE: 'red',
    ROLLBACK_FAILED: 'red',
    UPDATE_ROLLBACK_COMPLETE: 'gray',
    UPDATE_ROLLBACK_FAILED: 'red',
    UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS: 'yellow',
    UPDATE_ROLLBACK_IN_PROGRESS: 'yellow'
};

/**
 * @class
 */
class Actions {
    /**
     * Determine what will change about an existing CloudFormation stack by
     * performing a specific update
     *
     * @param {string} name - the name of the existing stack to update
     * @param {string} region - the region the stack is in
     * @param {string} changeSetType - the type of changeset, either UPDATE or CREATE
     * @param {string} templateUrl - the URL for the template on S3
     * @param {object} parameters - parameters for the ChangeSet
     * @param {function} callback - a function provided with a summary of the changes that
     * this change will perform to stack resources
     */
    static diff(name, region, changeSetType, templateUrl, parameters, expand, callback) {
        const cfn = new AWS.CloudFormation({
            region: region
        });
        const changesetId = 'a' + crypto.randomBytes(16).toString('hex');
        const changeSetParameters = changeSet(name, changeSetType, templateUrl, parameters, expand);
        changeSetParameters.ChangeSetName = changesetId;

        cfn.createChangeSet(changeSetParameters, (err) => {
            if (err) return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));

            describeChangeset(cfn, name, changesetId, (err, data) => {
                if (err) return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));

                const details = {
                    id: data.ChangeSetName,
                    status: data.Status,
                    execution: data.ExecutionStatus
                };

                if (data.Changes) details.changes = data.Changes.map((change) => {
                    return {
                        id: change.ResourceChange.PhysicalResourceId,
                        name: change.ResourceChange.LogicalResourceId,
                        type: change.ResourceChange.ResourceType,
                        action: change.ResourceChange.Action,
                        replacement: change.ResourceChange.Replacement === 'True'
                    };
                });

                callback(null, details);
            });
        });
    }

    /**
     * Execute a ChangeSet in order to perform an update on an existing CloudFormation stack
     *
     * @param {string} name - the name of the existing stack to update
     * @param {string} region - the region the stack is in
     * @param {string} changesetId - the name or ARN of an existing changeset
     * @param {function} callback - a function called when the stack update has been invoked
     */
    static executeChangeSet(name, region, changesetId, callback) {
        const cfn = new AWS.CloudFormation({
            region: region
        });

        describeChangeset(cfn, name, changesetId, (err, data) => {
            if (err) return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));

            if (data.ExecutionStatus !== 'AVAILABLE') {
                err = new Actions.ChangeSetNotExecutableError('Cannot execute changeset');
                err.execution = data.ExecutionStatus;
                err.status = data.Status;
                err.reason = data.StatusReason;
                return callback(err);
            }

            cfn.executeChangeSet({
                StackName: name,
                ChangeSetName: changesetId
            }, (err) => {
                if (err) return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));
                callback();
            });
        });
    }

    /**
     * Delete an existing CloudFormation stack
     *
     * @param {string} name - the name of the existing stack to update
     * @param {string} region - the region the stack is in
     * @param {function} callback - a function called when stack deletion is complete
     */
    static delete(name, region, callback) {
        const cfn = new AWS.CloudFormation({
            region: region
        });

        cfn.deleteStack({
            StackName: name
        }, (err) => {
            if (err) return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));
            callback();
        });
    }

    /**
     * Monitor a stack throughout a create, delete, or update
     *
     * @param {string} name - the full name of the existing stack to update
     * @param {string} region - the region the stack is in
     * @param {function} callback - a function called when stack action is complete
     */
    static monitor(name, region, callback) {
        const cfn = new AWS.CloudFormation({
            region: region
        });

        const events = eventStream(cfn, name)
            .on('error', (err) => {
                return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));
            });

        const stringify = new stream.Transform({ objectMode: true });
        stringify._transform = (event, enc, callback) => {
            let msg = event.ResourceStatus[colors[event.ResourceStatus]] + ' ' + event.LogicalResourceId;
            if (event.ResourceStatusReason) msg += ': ' + event.ResourceStatusReason;
            callback(null, currentTime() + ' ' + region + ': ' + msg + '\n');
        };

        events.pipe(stringify).pipe(process.stdout);
        stringify.on('end', callback);
    }

    /**
     * Validate a CloudFormation template
     *
     * @param {string} region - the region the stack would run in
     * @param {string} templateUrl - the URL for the template on S3
     * @param {function} callback - a function called when the template has been validated.
     * An invalid template will result in an error being provided to the callback. No error
     * object indicates that the template appears valid.
     */
    static validate(region, templateUrl, callback) {
        const cfn = new AWS.CloudFormation({
            region: region
        });

        cfn.validateTemplate({
            TemplateURL: templateUrl
        }, (err) => {
            if (err) return callback(new Actions.CloudFormationError('%s: %s', err.code, err.message));
            callback();
        });
    }

    /**
     * Save a CloudFormation stack's configuration to S3
     *
     * @param {string} baseName - the base name of the stack (no suffix)
     * @param {string} stackName - the deployed name of the stack
     * @param {string} stackRegion - the region of the stack
     * @param {string} bucket - the name of the S3 bucket to save the configuration into
     * @param {object} parameters - name/value pairs defining the stack configuration to save
     * @param {string} [kms] - if desired, the ID of the AWS KMS master encryption key to use
     * to encrypt this configuration at rest
     * @param {function} callback - a function that will be called when the configuration is saved
     */
    static saveConfiguration(baseName, stackName, stackRegion, bucket, parameters, kms, callback) {
        if (typeof kms === 'function') {
            callback = kms;
            kms = null;
        }

        lookup.bucketRegion(bucket, stackRegion, (err, region) => {
            const s3 = new AWS.S3({
                region: region,
                signatureVersion: 'v4'
            });

            const params = {
                Bucket: bucket,
                Key: lookup.configKey(baseName, stackName, stackRegion),
                Body: JSON.stringify(parameters)
            };

            if (kms) {
                params.ServerSideEncryption = 'aws:kms';
                params.SSEKMSKeyId = kms;
            }

            s3.putObject(params, (err) => {
                if (err && err.code === 'NoSuchBucket')
                    return callback(new Actions.BucketNotFoundError('S3 bucket %s not found in %s', bucket, region));
                if (err)
                    return callback(new Actions.S3Error('%s: %s', err.code, err.message));

                callback();
            });
        });
    }

    /**
     * Save a CloudFormation template to S3
     *
     * @param {string} templateUrl - an S3 URL where the template will be saved
     * @param {string} templateBody - the CloudFormation template as a JSON string
     * @param {function} callback - a function fired when the template has been saved
     */
    static saveTemplate(templateUrl, templateBody, callback) {
        const uri = url.parse(templateUrl);
        const prefix = uri.host.replace(/^s3[-.]/, '').split('.');
        const region = prefix.length === 2 ? 'us-east-1' : prefix[0];

        // If the template is too large, remove excess whitespace/indentation
        if (templateBody.length > 460800) {
            templateBody = JSON.stringify(JSON.parse(templateBody));
        }

        const s3 = new AWS.S3({
            region: region,
            signatureVersion: 'v4'
        });

        const params = Object.assign({
            Body: templateBody
        }, s3urls.fromUrl(templateUrl));

        s3.putObject(params, (err) => {
            if (err && err.code === 'NoSuchBucket')
                return callback(new Actions.BucketNotFoundError('S3 bucket %s not found in %s', params.Bucket, region));
            if (err)
                return callback(new Actions.S3Error('%s: %s', err.code, err.message));

            callback();
        });
    }

    /**
     * Create an S3 URL for a template
     *
     * @param {string} bucket - the bucket in which the template will be placed
     * @param {string} region - the region that the bucket is in
     * @param {string} name - the base name of the stack
     * @returns {string} an S3 URL where the template will be saved
     */
    static templateUrl(bucket, region, name) {
        const key = cuid() + '-' + name + '.template.json';

        let host;
        if (region == 'us-east-1') {
            host = 'https://s3.amazonaws.com';
        } else if (region.match(/^cn-/)) {
            host = 'https://s3.' + region + '.amazonaws.com.cn';
        } else {
            host = 'https://s3-' + region + '.amazonaws.com';
        }

        return [host, bucket, key].join('/');
    }

    /**
     * Error representing an unexpected failure in a CloudFormation request
     */
    static CloudFormationError = error('CloudFormationError');

    /**
     * Error representing a bucket that does not exist
     */
    static BucketNotFoundError = error('BucketNotFoundError');

    /**
     * Error representing an unexpected failure in an S3 request
     */
    static S3Error = error('S3Error');

    /**
     * Error representing an attempt to execute a changeset that is not executable
     */
    static ChangeSetNotExecutableError = error('ChangeSetNotExecutableError');
}

/**
 * Poll changeset until it has reached a completed state.
 *
 * @private
 * @param {object} cfn - a cloudformation client object
 * @param {string} name - the name of the existing stack to update
 * @param {string} changesetId - the name or ARN of an existing changeset
 * @param {function} callback - a function that will be provided with the changeset
 * details once the changeset is in CREATE_COMPLETE, DELETE_COMPLETE, or FAILED state
 */
function describeChangeset(cfn, name, changesetId, callback) {
    let changesetDescriptions;
    let changes = [];

    (function callAPI(nextToken, callback) {
        cfn.describeChangeSet({
            ChangeSetName: changesetId,
            StackName: name,
            NextToken: nextToken
        }, (err, data) => {
            if (err) return callback(err);

            changesetDescriptions = data;

            if (data.Status === 'CREATE_COMPLETE' || data.Status === 'FAILED' || data.status === 'DELETE_COMPLETE') {
                changes = changes.concat(data.Changes || []);

                if (!data.NextToken) {
                    if (changes.length) changesetDescriptions.Changes = changes;
                    return callback(null, changesetDescriptions);
                }
            }

            setTimeout(callAPI, 1000, data.NextToken, callback);
        });
    })(undefined, callback);
}

/**
 * Build ChangeSet object for CloudFormation requests
 *
 * @private
 * @param {string} name - the name of the stack
 * @param {string} changeSetType - the type of changeset, either UPDATE or CREATE
 * @param {string} templateUrl - the URL for the template on S3
 * @param {object} parameters - parameters for the ChangeSet
 * @returns {object} changeset - an object for use in ChangeSet requests that create/update a stack
 */
function changeSet(name, changeSetType, templateUrl, parameters, expand) {
    const base = {
        StackName: name,
        Capabilities: [
            'CAPABILITY_IAM',
            'CAPABILITY_NAMED_IAM'
        ],
        ChangeSetType: changeSetType,
        TemplateURL: templateUrl,
        Parameters: parameters
    };

    if (expand) base.Capabilities.push('CAPABILITY_AUTO_EXPAND');

    return base;
}

function currentTime() {
    const now = new Date();
    const hour = ('00' + now.getUTCHours()).slice(-2);
    const min = ('00' + now.getUTCMinutes()).slice(-2);
    const sec = ('00' + now.getUTCSeconds()).slice(-2);
    return [hour, min, sec].join(':') + 'Z';
}

module.exports = Actions;
