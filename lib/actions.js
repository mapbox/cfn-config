import url from 'url';
import crypto from 'crypto';
import stream from 'stream';
import AWS from 'aws-sdk';
import cuid from 'cuid';
import error from 'fasterror';
import s3urls from '@openaddresses/s3urls';
import eventStream from 'cfn-stack-event-stream';
import Lookup from './lookup.js';

import 'colors';

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

const signatureVersion = 'v4';

/**
 * @class
 */
export default class Actions {
    /**
     * Determine what will change about an existing CloudFormation stack by
     * performing a specific update
     *
     * @param {string} name - the name of the existing stack to update
     * @param {string} region - the region the stack is in
     * @param {string} changeSetType - the type of changeset, either UPDATE or CREATE
     * @param {string} templateUrl - the URL for the template on S3
     * @param {object} parameters - parameters for the ChangeSet
     * @param {Boolean} expand - Set CAPABILITY_AUTO_EXPAND
     * @param {Array} Tags - Tags to be applied to all resources in the stack
     */
    static async diff(name, region, changeSetType, templateUrl, parameters, expand, tags) {
        const cfn = new AWS.CloudFormation({ region });
        const changesetId = 'a' + crypto.randomBytes(16).toString('hex');
        const changeSetParameters = changeSet(name, changeSetType, templateUrl, parameters, expand, tags);
        changeSetParameters.ChangeSetName = changesetId;

        try {
            await cfn.createChangeSet(changeSetParameters).promise();
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        try {
            const data = await describeChangeset(cfn, name, changesetId);

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

            return details;
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }
    }

    /**
     * Execute a ChangeSet in order to perform an update on an existing CloudFormation stack
     *
     * @param {string} name - the name of the existing stack to update
     * @param {string} region - the region the stack is in
     * @param {string} changesetId - the name or ARN of an existing changeset
     */
    static async executeChangeSet(name, region, changesetId) {
        const cfn = new AWS.CloudFormation({ region });

        let data;
        try {
            data = await describeChangeset(cfn, name, changesetId);
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        if (data.ExecutionStatus !== 'AVAILABLE') {
            const err = new Actions.ChangeSetNotExecutableError('Cannot execute changeset');
            err.execution = data.ExecutionStatus;
            err.status = data.Status;
            err.reason = data.StatusReason;
            throw err;
        }

        try {
            await cfn.executeChangeSet({
                StackName: name,
                ChangeSetName: changesetId
            }).promise();
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Delete an existing CloudFormation stack
     *
     * @param {string} name - the name of the existing stack to update
     * @param {string} region - the region the stack is in
     */
    static async delete(name, region) {
        const cfn = new AWS.CloudFormation({ region });

        try {
            await cfn.deleteStack({
                StackName: name
            }).promise();
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Monitor a stack throughout a create, delete, or update
     *
     * @param {string} name - the full name of the existing stack to update
     * @param {string} region - the region the stack is in
     */
    static monitor(name, region) {
        return new Promise((resolve, reject) => {
            const cfn = new AWS.CloudFormation({ region });

            const events = eventStream(cfn, name)
                .on('error', (err) => {
                    return reject(new Actions.CloudFormationError('%s: %s', err.code, err.message));
                });

            const stringify = new stream.Transform({ objectMode: true });
            stringify._transform = (event, enc, cb) => {
                let msg = event.ResourceStatus[colors[event.ResourceStatus]] + ' ' + event.LogicalResourceId;
                if (event.ResourceStatusReason) msg += ': ' + event.ResourceStatusReason;
                cb(null, currentTime() + ' ' + region + ': ' + msg + '\n');
            };

            events.pipe(stringify).pipe(process.stdout);
            stringify.on('end', resolve);
        });
    }

    /**
     * Cancel a deployment to a stack, rolling it back
     *
     * @param {string} StackName - the full name of the existing stack to update
     * @param {string} region - the region the stack is in
     */
    static async cancel(StackName, region) {
        const cfn = new AWS.CloudFormation({ region });

        try {
            await cfn.cancelUpdateStack({ StackName }).promise();
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Validate a CloudFormation template
     *
     * @param {string} region - the region the stack would run in
     * @param {string} TemplateURL - the URL for the template on S3
     */
    static async validate(region, TemplateURL) {
        const cfn = new AWS.CloudFormation({ region });

        try {
            await cfn.validateTemplate({ TemplateURL }).promise();
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
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
     */
    static async saveConfiguration(baseName, stackName, stackRegion, bucket, parameters, kms=false) {
        const region = await Lookup.bucketRegion(bucket, stackRegion);

        const s3 = new AWS.S3({ region, signatureVersion });

        const params = {
            Bucket: bucket,
            Key: Lookup.configKey(baseName, stackName, stackRegion),
            Body: JSON.stringify(parameters)
        };

        if (kms) {
            params.ServerSideEncryption = 'aws:kms';
            params.SSEKMSKeyId = kms;
        }

        try {
            await s3.putObject(params).promise();
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Actions.BucketNotFoundError('S3 bucket %s not found in %s', bucket, region);
            } else {
                throw new Actions.S3Error('%s: %s', err.code, err.message);
            }
        }

        return;
    }

    /**
     * Save a CloudFormation template to S3
     *
     * @param {string} templateUrl - an S3 URL where the template will be saved
     * @param {string} templateBody - the CloudFormation template as a JSON string
     */
    static async saveTemplate(templateUrl, templateBody) {
        const uri = url.parse(templateUrl);
        const prefix = uri.host.replace(/^s3[-.]/, '').split('.');
        const region = prefix.length === 2 ? 'us-east-1' : prefix[0];

        // If the template is too large, remove excess whitespace/indentation
        if (templateBody.length > 460800) {
            templateBody = JSON.stringify(JSON.parse(templateBody));
        }

        const s3 = new AWS.S3({ region, signatureVersion });

        const params = Object.assign({
            Body: templateBody
        }, s3urls.fromUrl(templateUrl));

        try {
            await s3.putObject(params).promise();
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Actions.BucketNotFoundError('S3 bucket %s not found in %s', params.Bucket, region);
            } else {
                throw new Actions.S3Error('%s: %s', err.code, err.message);
            }
        }
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
 */
async function describeChangeset(cfn, name, changesetId) {
    let changesetDescriptions;
    let changes = [];

    let nextToken = true;
    do {
        const data = await cfn.describeChangeSet({
            ChangeSetName: changesetId,
            StackName: name,
            NextToken: nextToken === true ? undefined : nextToken
        }).promise();

        changesetDescriptions = data;

        if (data.Status === 'CREATE_COMPLETE' || data.Status === 'FAILED' || data.status === 'DELETE_COMPLETE') {
            changes = changes.concat(data.Changes || []);
            if (!data.NextToken) break;
        }

        nextToken = data.NextToken || true;
        if (nextToken) await sleep(1000);
    } while (nextToken);

    if (changes.length) changesetDescriptions.Changes = changes;
    return changesetDescriptions;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


/**
 * Build ChangeSet object for CloudFormation requests
 *
 * @private
 * @param {string} StackName - the name of the stack
 * @param {string} ChangeSetType - the type of changeset, either UPDATE or CREATE
 * @param {string} TemplateURL - the URL for the template on S3
 * @param {object} Parameters - parameters for the ChangeSet
 * @param {Boolean} expand - Set CAPABILITY_AUTO_EXPAND
 * @param {Array} [Tags=[]] - Tags to be applied to all resources in the stack
 * @returns {object} changeset - an object for use in ChangeSet requests that create/update a stack
 */
function changeSet(StackName, ChangeSetType, TemplateURL, Parameters, expand, Tags=[]) {
    const base = {
        StackName,
        Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM'],
        ChangeSetType,
        TemplateURL,
        Parameters,
        Tags
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
