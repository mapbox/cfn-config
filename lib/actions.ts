import url from 'url';
import type { CFNConfigClient } from '../index.js';
import crypto from 'crypto';
import stream from 'stream';
import { randomUUID } from 'crypto';
import s3urls from '@openaddresses/s3urls';
import eventStream from './cfstream.js';
import Lookup from './lookup.js';
import {
    Tag,
    Change,
    Parameter,
    CloudFormationClient,
    CreateChangeSetCommand,
    CreateChangeSetCommandInput,
    DescribeChangeSetCommand,
    DescribeChangeSetCommandOutput,
    ValidateTemplateCommand,
    DeleteStackCommand,
    ExecuteChangeSetCommand,
    CancelUpdateStackCommand
} from '@aws-sdk/client-cloudformation';

import {
    S3Client,
    PutObjectCommand,
    PutObjectCommandInput
} from '@aws-sdk/client-s3';

import 'colors';

const colors = new Map();
colors.set('CREATE_IN_PROGRESS', 'yellow');
colors.set('CREATE_FAILED', 'red');
colors.set('CREATE_COMPLETE', 'green');
colors.set('DELETE_IN_PROGRESS', 'yellow');
colors.set('DELETE_FAILED', 'red');
colors.set('DELETE_COMPLETE', 'grey');
colors.set('DELETE_SKIPPED', 'red');
colors.set('UPDATE_IN_PROGRESS', 'yellow');
colors.set('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 'yellow');
colors.set('UPDATE_FAILED', 'red');
colors.set('UPDATE_COMPLETE', 'green');
colors.set('ROLLBACK_IN_PROGRESS', 'red');
colors.set('ROLLBACK_COMPLETE', 'red');
colors.set('ROLLBACK_FAILED', 'red');
colors.set('UPDATE_ROLLBACK_COMPLETE', 'gray');
colors.set('UPDATE_ROLLBACK_FAILED', 'red');
colors.set('UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS', 'yellow');
colors.set('UPDATE_ROLLBACK_IN_PROGRESS', 'yellow');

export interface ChangeSetDetail {
    id: string;
    status: string;
    execution: string;
    changes: ChangeSetDetailChange[];
};

export interface ChangeSetDetailChange {
    id: string;
    name: string;
    type: string;
    action: string;
    replacement: boolean;
};

/**
 * Error representing an unexpected failure in a CloudFormation request
 */
class CloudFormationError extends Error {};

/**
 * Error representing a bucket that does not exist
 */
class BucketNotFoundError extends Error {};

/**
 * Error representing an unexpected failure in an S3 request
 */
class S3Error extends Error {};

/**
 * Error representing an attempt to execute a changeset that is not executable
 */
class ChangeSetNotExecutableError extends Error {
    status?: string;
    execution?: string;
    reason?: string;
};

/**
 * @class
 */
export default class Actions {
    client: CFNConfigClient;

    constructor(client: CFNConfigClient) {
        this.client = client;
    }

    static CloudFormationError = CloudFormationError;
    static BucketNotFoundError = BucketNotFoundError;
    static S3Error = S3Error;
    static ChangeSetNotExecutableError = ChangeSetNotExecutableError;

    /**
     * Determine what will change about an existing CloudFormation stack by
     * performing a specific update
     *
     * @param name - the name of the existing stack to update
     * @param changeSetType - the type of changeset, either UPDATE or CREATE
     * @param templateUrl - the URL for the template on S3
     * @param parameters - parameters for the ChangeSet
     * @param Tags - Tags to be applied to all resources in the stack
     * @param expand - Set CAPABILITY_AUTO_EXPAND
     */
    async diff(name: string, changeSetType: string, templateUrl: string, parameters: Parameter[], tags: Tag[], expand: boolean) {
        const cfn = new CloudFormationClient(this.client);
        const changeSetParameters = changeSet(name, changeSetType, templateUrl, parameters, expand, tags);

        try {
            await cfn.send(new CreateChangeSetCommand(changeSetParameters));
        } catch (err) {
            throw new Actions.CloudFormationError(err.message);
        }

        try {
            const data = await describeChangeset(cfn, name, changeSetParameters.ChangeSetName);

            const details: ChangeSetDetail = {
                id: data.ChangeSetName,
                status: data.Status,
                execution: data.ExecutionStatus,
                changes: []
            };

            if (data.Changes) {
                details.changes = data.Changes.map((change: Change) => {
                    return {
                        id: change.ResourceChange.PhysicalResourceId,
                        name: change.ResourceChange.LogicalResourceId,
                        type: change.ResourceChange.ResourceType,
                        action: change.ResourceChange.Action,
                        replacement: change.ResourceChange.Replacement === 'True'
                    };
                });
            }

            return details;
        } catch (err) {
            throw new Actions.CloudFormationError(err.message);
        }
    }

    /**
     * Execute a ChangeSet in order to perform an update on an existing CloudFormation stack
     *
     * @param name - the name of the existing stack to update
     * @param changesetId - the name or ARN of an existing changeset
     */
    async executeChangeSet(name: string, changesetId: string) {
        const cfn = new CloudFormationClient(this.client);

        let data;
        try {
            data = await describeChangeset(cfn, name, changesetId);
        } catch (err) {
            throw new Actions.CloudFormationError(err.message);
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
            throw new Actions.CloudFormationError(err.message);
        }

        return;
    }

    /**
     * Delete an existing CloudFormation stack
     *
     * @param name - the name of the existing stack to update
     */
    async delete(name: string) {
        const cfn = new CloudFormationClient(this.client);

        try {
            await cfn.send(new DeleteStackCommand({
                StackName: name
            }));
        } catch (err) {
            throw new Actions.CloudFormationError(err.message);
        }

        return;
    }

    /**
     * Monitor a stack throughout a create, delete, or update
     *
     * @param StackName - the full name of the existing stack to update
     */
    monitor(StackName: string) {
        return new Promise((resolve, reject) => {
            const events = eventStream(StackName, { ...this.client })
                .on('error', (err) => {
                    return reject(new Actions.CloudFormationError(err.message));
                });

            const stringify = new stream.Transform({ objectMode: true });
            stringify._transform = (event, enc, cb) => {
                let msg = event.ResourceStatus[colors.get(event.ResourceStatus)] + ' ' + event.LogicalResourceId;
                if (event.ResourceStatusReason) msg += ': ' + event.ResourceStatusReason;
                cb(null, currentTime() + ' ' + this.client.region + ': ' + msg + '\n');
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
        const cfn = new CloudFormationClient(this.client);

        try {
            await cfn.send(new CancelUpdateStackCommand({ StackName }));
        } catch (err) {
            throw new Actions.CloudFormationError('%s: %s', err.message);
        }

        return;
    }

    /**
     * Validate a CloudFormation template
     *
     * @param TemplateURL - the URL for the template on S3
     */
    async validate(TemplateURL: string) {
        const cfn = new CloudFormationClient(this.client);

        try {
            await cfn.send(new ValidateTemplateCommand({ TemplateURL }));
        } catch (err) {
            throw new Actions.CloudFormationError(err.message);
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
     */
    async saveConfiguration(baseName: string, stackName: string, bucket: string, parameters: object) {
        const lookup = new Lookup(this.client);
        const region = await lookup.bucketRegion(bucket);

        const s3 = new S3Client({
            region,
            credentials: this.client.credentials
        });

        const params: PutObjectCommandInput = {
            Bucket: bucket,
            Key: lookup.configKey(baseName, stackName),
            Body: JSON.stringify(parameters),
        };

        try {
            await s3.send(new PutObjectCommand(params));
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Actions.BucketNotFoundError(`S3 bucket ${bucket} not found in ${region}`);
            } else {
                throw new Actions.S3Error(err.message);
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

        const s3 = new S3Client(this.client);

        const params = Object.assign({
            Body: templateBody
        }, s3urls.fromUrl(templateUrl));

        try {
            await s3.send(new PutObjectCommand(params));
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Actions.BucketNotFoundError(`S3 bucket ${params.Bucket} not found in ${region}`);
            } else {
                throw new Actions.S3Error(err.message);
            }
        }
    }

    /**
     * Create an S3 URL for a template
     *
     * @param bucket - the bucket in which the template will be placed
     * @param name - the base name of the stack
     * @returns an S3 URL where the template will be saved
     */
    async templateUrl(bucket: string, name: string): Promise<string> {
        const lookup = new Lookup(this.client);
        const region = await lookup.bucketRegion(bucket);
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
    let changes: Change[] = [];

    let nextToken = '';
    do {
        const data: DescribeChangeSetCommandOutput = await cfn.send(new DescribeChangeSetCommand({
            ChangeSetName: changesetId,
            StackName: name,
            NextToken: nextToken ? nextToken : nextToken
        }));

        changesetDescriptions = data;

        if (data.Status === 'CREATE_COMPLETE' || data.Status === 'FAILED' || data.Status === 'DELETE_COMPLETE') {
            changes = changes.concat(data.Changes || []);
            if (!data.NextToken) break;
        }

        nextToken = data.NextToken || '';
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
function changeSet(
    StackName: string,
    ChangeSetType: string,
    TemplateURL: string,
    Parameters: Parameter[],
    expand: boolean,
    Tags: Tag[] =[]
): CreateChangeSetCommandInput {
    const ChangeSetName = 'a' + crypto.randomBytes(16).toString('hex');

    const base = {
        StackName,
        ChangeSetName,
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
