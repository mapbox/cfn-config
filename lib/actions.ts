import url from 'url';
import CFNConfig from '../index.js';
import crypto from 'crypto';
import stream from 'stream';
import { randomUUID } from 'crypto';
// @ts-ignore
import error from 'fasterror';
import s3urls from '@openaddresses/s3urls';
import eventStream from './cfstream.js';
import Lookup from './lookup.js';
import {
    CloudFormationClient,
    CreateChangeSetCommand,
    DescribeChangeSetCommand,
    ValidateTemplateCommand,
    DeleteStackCommand,
    ExecuteChangeSetCommand,
    CancelUpdateStackCommand
} from '@aws-sdk/client-cloudformation';

import {
    S3Client,
    PutObjectCommand
} from '@aws-sdk/client-s3';

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

/**
 * @class
 */
export default class Actions {
    cfnconfig: CFNConfig;

    constructor(cfnconfig: CFNConfig) {
        this.cfnconfig = cfnconfig;
    }

    /**
     * Determine what will change about an existing CloudFormation stack by
     * performing a specific update
     *
     * @param name - the name of the existing stack to update
     * @param changeSetType - the type of changeset, either UPDATE or CREATE
     * @param templateUrl - the URL for the template on S3
     * @param parameters - parameters for the ChangeSet
     * @param expand - Set CAPABILITY_AUTO_EXPAND
     * @param Tags - Tags to be applied to all resources in the stack
     */
    async diff(name: string, changeSetType: string, templateUrl: string, parameters: object, expand: boolean, tags: object[]) {
        const cfn = new CloudFormationClient(this.cfnconfig.client);
        const changesetId = 'a' + crypto.randomBytes(16).toString('hex');
        const changeSetParameters = changeSet(name, changeSetType, templateUrl, parameters, expand, tags);
        changeSetParameters.ChangeSetName = changesetId;

        try {
            await cfn.send(new CreateChangeSetCommand(changeSetParameters));
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        try {
            const data = await describeChangeset(cfn, name, changesetId);

            const details = {
                id: data.ChangeSetName,
                status: data.Status,
                execution: data.ExecutionStatus,
                changes: []
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
     * @param name - the name of the existing stack to update
     * @param changesetId - the name or ARN of an existing changeset
     */
    async executeChangeSet(name: string, changesetId: string) {
        const cfn = new CloudFormationClient(this.cfnconfig.client);

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
            await cfn.send(new ExecuteChangeSetCommand({
                StackName: name,
                ChangeSetName: changesetId
            }));
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Delete an existing CloudFormation stack
     *
     * @param name - the name of the existing stack to update
     */
    async delete(name: string) {
        const cfn = new CloudFormationClient(this.cfnconfig.client);

        try {
            await cfn.send(new DeleteStackCommand({
                StackName: name
            }));
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Monitor a stack throughout a create, delete, or update
     *
     * @param name - the full name of the existing stack to update
     */
    monitor(name: string) {
        return new Promise((resolve, reject) => {
            const events = eventStream(name, { ...this.cfnconfig.client })
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
     * @param StackName - the full name of the existing stack to update
     */
    async cancel(StackName: string) {
        const cfn = new CloudFormationClient(this.cfnconfig.client);

        try {
            await cfn.send(new CancelUpdateStackCommand({ StackName }));
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Validate a CloudFormation template
     *
     * @param TemplateURL - the URL for the template on S3
     */
    async validate(TemplateURL: string) {
        const cfn = new CloudFormationClient(this.cfnconfig.client);

        try {
            await cfn.send(new ValidateTemplateCommand({ TemplateURL }));
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.code, err.message);
        }

        return;
    }

    /**
     * Save a CloudFormation stack's configuration to S3
     *
     * @param baseName - the base name of the stack (no suffix)
     * @param stackName - the deployed name of the stack
     * @param bucket - the name of the S3 bucket to save the configuration into
     * @param parameters - name/value pairs defining the stack configuration to save
     * @param [kms] - if desired, the ID of the AWS KMS master encryption key to use
     * to encrypt this configuration at rest
     */
    async saveConfiguration(baseName: string, stackName: string, bucket: string, parameters: object, kms: string | undefined) {
        const region = await Lookup.bucketRegion(bucket, stackRegion);

        const s3 = new S3Client(this.cfnconfig.client);

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
            await s3.send(new PutObjectCommand(params));
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
     * @param templateUrl - an S3 URL where the template will be saved
     * @param templateBody - the CloudFormation template as a JSON string
     */
    async saveTemplate(templateUrl: string, templateBody: string) {
        const uri = url.parse(templateUrl);
        const prefix = uri.host.replace(/^s3[-.]/, '').split('.');
        const region = prefix.length === 2 ? 'us-east-1' : prefix[0];

        // If the template is too large, remove excess whitespace/indentation
        if (templateBody.length > 460800) {
            templateBody = JSON.stringify(JSON.parse(templateBody));
        }

        const s3 = new S3Client(this.cfnconfig.client);

        const params = Object.assign({
            Body: templateBody
        }, s3urls.fromUrl(templateUrl));

        try {
            await s3.send(new PutObjectCommand(params));
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
     * @param bucket - the bucket in which the template will be placed
     * @param region - the region that the bucket is in
     * @param name - the base name of the stack
     * @returns an S3 URL where the template will be saved
     */
    templateUrl(bucket: string, region: string, name: string): string {
        const key = randomUUID() + '-' + name + '.template.json';

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
async function describeChangeset(cfn: CloudFormationClient, name: string, changesetId: string) {
    let changesetDescriptions;
    let changes = [];

    let nextToken = true;
    do {
        const data = await cfn.send(new DescribeChangeSetCommand({
            ChangeSetName: changesetId,
            StackName: name,
            NextToken: nextToken === true ? undefined : nextToken
        }));

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

function sleep(ms: number): Promise<undefined> {
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
function changeSet(StackName: string, ChangeSetType: string, TemplateURL: string, Parameters: object, expand: boolean, Tags=[]) {
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
