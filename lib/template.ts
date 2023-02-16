import fs from 'fs/promises';
import CFNConfig from '../index.js';
// @ts-ignore
import error from 'fasterror';
import s3urls from '@openaddresses/s3urls';
import {
    KMSClient,
    EncryptCommand
} from '@aws-sdk/client-kms';
import {
    S3Client,
    GetObjectCommand,
    GetBucketLocationCommand
} from '@aws-sdk/client-s3';

/**
 * @class
 * Cloudformation Template
 */
export default class Template {
    cfnconfig: CFNConfig;

    constructor(cfnconfig: CFNConfig) {
        this.cfnconfig = cfnconfig;
    }

    /**
     * Read a template from a local file or from S3
     *
     * @param {URL} templatePath - the absolute path to a local file or an S3 url
     * @param {object} [options] - an object to pass as the first argument to async templates
     */
    async read(templatePath: string, options?={}) {
        if (!(templatePath instanceof URL)) throw new Error('templatePath must be of type URL');

        const params = s3urls.fromUrl(String(templatePath));

        if (!params.Bucket || !params.Key) {
            try {
                await fs.stat(templatePath);
            } catch (err) {
                throw new Template.NotFoundError('%s does not exist', templatePath);
            }

            let templateBody;

            if (!/\.js$/.test(String(templatePath))) {
                templateBody = String(await fs.readFile(templatePath));

                try {
                    templateBody = JSON.parse(templateBody);
                } catch (err) {
                    throw new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message);
                }

                return templateBody;
            }

            try {
                templateBody = (await import(templatePath)).default;
            } catch (err) {
                throw new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message);
            }

            if (typeof templateBody === 'function') {
                return await async(templateBody, options);
            } else {
                return templateBody;
            }
        } else {
            let s3 = new S3Client(this.cfnconfig.client);

            let data;
            try {
                data = await s3.send(new GetBucketLocationCommand({
                    Bucket: params.Bucket
                }));
            } catch (err) {
                throw new Template.NotFoundError('%s could not be loaded - S3 responded with %s: %s', templatePath, err.code, err.message);
            }

            s3 = new S3Client(this.cfnconfig.client);

            try {
                data = await s3.send(new GetObjectCommand(params));
            } catch (err) {
                throw new Template.NotFoundError('%s could not be loaded - S3 responded with %s: %s', templatePath, err.code, err.message);
            }

            let templateBody;
            try {
                templateBody = JSON.parse(data.Body.toString());
            } catch (err) {
                throw new Template.InvalidTemplateError('Failed to parse %s', templatePath);
            }

            return templateBody;
        }
    }

    /**
     * Create questions for each Parameter in a CloudFormation template
     *
     * @param {object} templateBody - a parsed CloudFormation template
     * @returns {array} a set of questions for user prompting
     */
    questions(templateBody: object, overrides?: object) {
        overrides = overrides || {};
        overrides.defaults = overrides.defaults || {};
        overrides.messages = overrides.messages || {};
        overrides.choices = overrides.choices || {};
        overrides.kmsKeyId = (overrides.kmsKeyId && typeof overrides.kmsKeyId !== 'string') ? 'alias/cloudformation' : overrides.kmsKeyId;

        // Not sure where the region should come from, but it's very important here
        const kms = new KMSClient(this.cfnconfig.client);

        return Object.keys(templateBody.Parameters || {}).map((name) => {
            const parameter = templateBody.Parameters[name];

            const question = {};
            question.name = name;
            question.choices = parameter.AllowedValues;
            question.default = parameter.Default;

            question.message = name;
            if (parameter.Description) question.message += '. ' + parameter.Description;
            question.message += ':';

            question.type = (() => {
                if (parameter.NoEcho) return 'password';
                if (parameter.AllowedValues) return 'list';
                return 'input';
            })();

            question.validate = (input) => {
                let valid = true;
                if ('MinLength' in parameter) valid = valid && input.length >= parameter.MinLength;
                if ('MaxLength' in parameter) valid = valid && input.length <= parameter.MaxLength;
                if ('MinValue' in parameter) valid = valid && Number(input) >= parameter.MinValue;
                if ('MaxValue' in parameter) valid = valid && Number(input) <= parameter.MaxValue;
                if (parameter.AllowedPattern) valid = valid && (new RegExp(parameter.AllowedPattern)).test(input);
                if (parameter.Type === 'List<Number>') valid = valid && input.split(',').every((num) => {
                    return !isNaN(parseFloat(num));
                });

                return valid;
            };

            question.filter = function(input) {
                const done = this.async();

                if (overrides.kmsKeyId && (parameter.Description || '').indexOf('[secure]') > -1 && input.slice(0, 7) !== 'secure:') {
                    // TODO: this is messed up
                    return kms.send(new EncryptCommand({
                        KeyId: overrides.kmsKeyId,
                        Plaintext: input
                    }, (err, encrypted) => {
                        if (err && err.code === 'NotFoundException') return done(new Template.NotFoundError('Unable to find KMS encryption key "' + overrides.kmsKeyId + '"'));
                        if (err) return done(new Template.KmsError('%s: %s', err.code, err.message));

                        return done(null, 'secure:' + encrypted.CiphertextBlob.toString('base64'));
                    }));
                } else {
                    return done(null, input);
                }
            };

            if (name in overrides.choices) question.choices = overrides.choices[name];
            if (name in overrides.messages) question.message = overrides.messages[name];
            if (name in overrides.defaults) {
                if (!question.choices || question.choices.indexOf(overrides.defaults[name]) !== -1)
                    question.default = overrides.defaults[name];
            }

            return question;
        });
    }

    /**
     * Error representing a template that could not be found
     */
    static NotFoundError = error('NotFoundError');

    /**
     * Error representing a template that could not be parsed
     */
    static InvalidTemplateError = error('InvalidTemplateError');

    /**
     * Error representing an unrecognized KMS failure
     */
    static KmsError = error('KmsError');
}
