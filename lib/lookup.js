import AWS from 'aws-sdk';
import error from 'fasterror';
import path from 'path';
import s3urls from '@openaddresses/s3urls';

/**
 * Information about a CloudFormation stack
 *
 * @name StackInfo
 * TODO: more
 */

/**
 * @class
 */
export default class Lookup {
    /**
     * Lookup an existing CloudFormation stack's parameters
     *
     * @param {string} name - the full name of the stack
     * @param {string} region - the region the stack is in
     */
    static async parameters(name, region) {
        const info = await Lookup.info(name, region);
        return info.Parameters;
    }

    /**
     * Lookup an existing CloudFormation stack's info
     *
     * @param {string} name - the full name of the stack
     * @param {string} region - the region the stack is in
     * @param {boolean} [resources=false] - return information about each resource in the stack
     * @param {boolean} [decrypt=false] - return secure parameters decrypted
     */
    static async info(name, region, resources=false, decrypt=false) {
        const cfn = new AWS.CloudFormation({ region });

        let data;
        try {
            data = await cfn.describeStacks({
                StackName: name
            }).promise();
        } catch (err) {
            if (err.code === 'ValidationError' && /Stack with id/.test(err.message)) {
                throw new Lookup.StackNotFoundError('Stack %s not found in %s', name, region);
            } else {
                throw new Lookup.CloudFormationError('%s: %s', err.code, err.message);
            }
        }

        if (!data.Stacks.length) throw new Lookup.StackNotFoundError('Stack %s not found in %s', name, region);

        const stackInfo = data.Stacks[0];
        stackInfo.Region = region;

        stackInfo.Parameters = (stackInfo.Parameters || []).reduce((memo, param) => {
            memo[param.ParameterKey] = param.ParameterValue;
            return memo;
        }, {});

        stackInfo.Outputs = (stackInfo.Outputs || []).reduce((memo, output) => {
            memo[output.OutputKey] = output.OutputValue;
            return memo;
        }, {});

        stackInfo.Tags = (stackInfo.Tags || []).reduce((memo, output) => {
            memo[output.Key] = output.Value;
            return memo;
        }, {});

        if (!resources) {
            if (!decrypt) return stackInfo;
            stackInfo.Parameters = await Lookup.decryptParameters(stackInfo.Parameters, region);
            return stackInfo;
        }

        const resource_data = {
            StackResourceSummaries: []
        };

        try {
            let page = await cfn.listStackResources({
                StackName: name
            }).promise();

            resource_data.StackResourceSummaries = resource_data.StackResourceSummaries.concat(page.StackResourceSummaries);

            while (page.NextToken) {
                page = await cfn.listStackResources({
                    NextToken: page.NextToken
                }).promise();

                resource_data.StackResourceSummaries = resource_data.StackResourceSummaries.concat(page.StackResourceSummaries);
            }

            stackInfo.StackResources = resource_data.StackResourceSummaries;

            if (!decrypt) return stackInfo;
            stackInfo.Parameters = await Lookup.decryptParameters(stackInfo.Parameters, region);
            return stackInfo;
        } catch (err) {
            throw new Lookup.CloudFormationError('%s: %s', err.code, err.message);
        }
    }

    /**
     * Lookup an existing CloudFormation stack's template
     *
     * @param {string} name - the full name of the stack
     * @param {string} region - the region the stack is in
     */
    static async template(name, region) {
        const cfn = new AWS.CloudFormation({ region });

        let data;
        try {
            data = await cfn.getTemplate({
                StackName: name,
                TemplateStage: 'Original' // This can potentially return a YAML file if the stack was created by a different deploy tool
            }).promise();
        } catch (err) {
            if (err.code === 'ValidationError' && /Stack with id/.test(err.message)) {
                throw new Lookup.StackNotFoundError('Stack %s not found in %s', name, region);
            } else {
                throw new Lookup.CloudFormationError('%s: %s', err.code, err.message);
            }
        }

        try {
            // If this fails the above API probably returned YAML, ask for the processed result
            return JSON.parse(data.TemplateBody);
        } catch (err) {
            try {
                data = await cfn.getTemplate({
                    StackName: name,
                    TemplateStage: 'Processed'
                }).promise();

                return JSON.parse(data.TemplateBody);
            } catch (err) {
                if (err.code === 'ValidationError' && /Stack with id/.test(err.message)) {
                    throw new Lookup.StackNotFoundError('Stack %s not found in %s', name, region);
                } else {
                    throw new Lookup.CloudFormationError('%s: %s', err.code, err.message);
                }
            }
        }
    }

    /**
     * Lookup available saved configurations on S3
     *
     * @param {string} name - the base name of the stack (no suffix)
     * @param {string} bucket - the name of the S3 bucket containing saved configurations
     * @param {string} [region] - the name of the region in which to make lookup requests
     */
    static async configurations(name, bucket, region) {
        region = await Lookup.bucketRegion(bucket, region);

        const s3 = new AWS.S3({ region, signatureVersion: 'v4' });

        try {
            const data = await s3.listObjects({
                Bucket: bucket,
                Prefix: name + '/'
            }).promise();

            return data.Contents.filter((obj) => {
                return obj.Key.split('.').slice(-2).join('.') === 'cfn.json' && obj.Size > 0;
            }).map((obj) => {
                return path.basename(obj.Key, '.cfn.json');
            });
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Lookup.BucketNotFoundError('S3 bucket %s not found in %s', bucket, region);
            } else {
                throw new Lookup.S3Error('%s: %s', err.code, err.message);
            }
        }
    }

    /**
     * Lookup a saved configuration object from S3
     *
     * @param {string} name - the base name of the stack (no suffix)
     * @param {string} bucket - the name of the S3 bucket containing saved configurations
     * @param {string} config - the name of the saved configuration
     */
    static async configuration(name, bucket, config) {
        const region = await Lookup.bucketRegion(bucket);

        const s3 = new AWS.S3({
            region,
            signatureVersion: 'v4'
        });

        let data;
        try {
            data = await s3.getObject({
                Bucket: bucket,
                Key: Lookup.configKey(name, config)
            }).promise();
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Lookup.BucketNotFoundError('S3 bucket %s not found in %s', bucket, region);
            } else if (err.code === 'NoSuchKey') {
                throw new Lookup.ConfigurationNotFoundError('Configuration %s not found in %s in %s', config, bucket, region);
            } else {
                throw new Lookup.S3Error('%s: %s', err.code, err.message);
            }
        }

        let info = data.Body.toString();
        try {
            info = JSON.parse(info);
        } catch (err) {
            throw new Lookup.InvalidConfigurationError('Invalid configuration');
        }

        return info;
    }

    /**
     * Lookup a default saved configuration by providing an S3 url. This function will
     * silently absorb any failures encountered while fetching or parsing the requested file.
     *
     * @param {string} s3url - a URL pointing to a configuration object on S3
     *
     */
    static async defaultConfiguration(s3url) {
        const params = s3urls.fromUrl(s3url);

        let region;
        try {
            region = await Lookup.bucketRegion(params.bucket);
        } catch (err) {
            return {};
        }

        const s3 = new AWS.S3({
            region,
            signatureVersion: 'v4'
        });

        let data;
        try {
            data = await s3.getObject(params).promise();
        } catch (err) {
            return {};
        }

        let info = data.Body.toString();
        try {
            info = JSON.parse(info);
        } catch (err) {
            return {};
        }

        return info;
    }

    /**
     * Given a stack name and configuration name, provides the key where the configuration
     * should be stored on S3
     *
     * @param {string} name - the stack's base name (no suffix)
     * @param {string} config - the configuration's name
     * @returns {string} an S3 key
     */
    static configKey(name, stackName, region) {
        return region ?
            name + '/' + stackName + '-' + region + '.cfn.json' :
            name + '/' + stackName + '.cfn.json';
    }

    /**
     * Find a bucket's region
     *
     * @param {string} bucket - the name of the bucket
     * @param {string} [region] - the name of the region in which to make lookup requests
     */
    static async bucketRegion(bucket, region) {
        const s3 = new AWS.S3({
            signatureVersion: 'v4',
            region
        });

        try {
            const data = await s3.getBucketLocation({
                Bucket: bucket
            }).promise();

            return data.LocationConstraint || undefined;
        } catch (err) {
            if (err.code === 'NoSuchBucket') {
                throw new Lookup.BucketNotFoundError('S3 bucket %s not found', bucket);
            } else {
                throw new Lookup.S3Error('%s: %s', err.code, err.message);
            }
        }
    }

    /**
     * Decrypt any encrypted parameters.
     *
     * @param {object} parameters - stack parameters
     * @param {string} region - stack region
     */
    static async decryptParameters(parameters, region) {
        const kms = new AWS.KMS({
            region,
            maxRetries: 10
        });
        const decrypted = JSON.parse(JSON.stringify(parameters));

        try {
            let results = [];
            for (const key of Object.keys(parameters)) {
                if (!(/^secure:/).test(parameters[key])) continue;

                const val = parameters[key].replace(/^secure:/, '');

                const data = await kms.decrypt({
                    CiphertextBlob: new Buffer.from(val, 'base64')
                }).promise();

                results.push({
                    key: key,
                    val: val,
                    decrypted: (new Buffer.from(data.Plaintext, 'base64')).toString('utf8')
                });
            }

            results.forEach((data) => {
                decrypted[data.key] = data.decrypted;
            });

            return decrypted;
        } catch (err) {
            throw new Lookup.DecryptParametersError('%s: %s', err.code, err.message);
        }
    }

    /**
     * Error representing an unexpected failure in a CloudFormation request
     */
    static CloudFormationError = error('CloudFormationError');

    /**
     * Error representing a template that does not exist
     */
    static StackNotFoundError = error('StackNotFoundError');

    /**
     * Error representing an unexpected failure in an S3 request
     */
    static S3Error = error('S3Error');

    /**
     * Error representing a bucket that does not exist
     */
    static BucketNotFoundError = error('BucketNotFoundError');

    /**
     * Error representing a saved configuration that does not exist
     */
    static ConfigurationNotFoundError = error('ConfigurationNotFoundError');

    /**
     * Error representing a saved configuration object that could not be parsed
     */
    static InvalidConfigurationError = error('InvalidConfigurationError');

    /**
     * Error representing a failure to decrypt secure parameters
     */
    static DecryptParametersError = error('DecryptParametersError');
}
