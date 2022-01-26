const fs = require('fs/promises');
const path = require('path');
const error = require('fasterror');
const AWS = require('aws-sdk');
const s3urls = require('s3urls');

/**
 * @class
 * Cloudformation Template
 */
class Template {
    /**
     * Read a template from a local file or from S3
     *
     * @param {string} templatePath - the absolute or relative path to a local file or an S3 url
     * @param {object} [options] - an object to pass as the first argument to async templates
     */
    static async read(templatePath, options={}) {
        const params = s3urls.fromUrl(templatePath);
        if (!params.Bucket || !params.Key) {
            try {
                await fs.stat(templatePath);
            } catch (err) {
                throw new Template.NotFoundError('%s does not exist', templatePath);
            }

            let templateBody;

            if (!/\.js$/.test(templatePath)) {
                templateBody = await fs.readFile(templatePath);

                try {
                    templateBody = JSON.parse(templateBody);
                } catch (err) {
                    throw new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message);
                }

                return templateBody;
            }

            try {
                templateBody = require(path.resolve(templatePath));
            } catch (err) {
                throw new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message);
            }

            if (typeof templateBody === 'function') {
                return await async(templateBody, options);
            } else {
                return templateBody;
            }
        } else {
            let s3 = new AWS.S3({ signatureVersion: 'v4' });

            let data;
            try {
                data = await s3.getBucketLocation({
                    Bucket: params.Bucket
                }).promise();
            } catch (err) {
                throw new Template.NotFoundError('%s could not be loaded - S3 responded with %s: %s', templatePath, err.code, err.message);
            }

            s3 = new AWS.S3({
                region: data.LocationConstraint || undefined
            });

            try {
                data = s3.getObject(params).promise();
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
    static questions(templateBody, overrides) {
        overrides = overrides || {};
        overrides.defaults = overrides.defaults || {};
        overrides.messages = overrides.messages || {};
        overrides.choices = overrides.choices || {};
        overrides.kmsKeyId = (overrides.kmsKeyId && typeof overrides.kmsKeyId !== 'string') ? 'alias/cloudformation' : overrides.kmsKeyId;
        overrides.region = overrides.region || 'us-east-1';

        // Not sure where the region should come from, but it's very important here
        const kms = new AWS.KMS({
            region: overrides.region
        });

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
                    return kms.encrypt({
                        KeyId: overrides.kmsKeyId,
                        Plaintext: input
                    }, (err, encrypted) => {
                        if (err && err.code === 'NotFoundException') return done(new Template.NotFoundError('Unable to find KMS encryption key "' + overrides.kmsKeyId + '"'));
                        if (err) return done(new Template.KmsError('%s: %s', err.code, err.message));

                        return done(null, 'secure:' + encrypted.CiphertextBlob.toString('base64'));
                    });
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

function async(fn, config) {
    return new Promise((resolve, reject) => {
        fn(config, (err, res) => {
            if (err) return reject(err);
            return resolve(res);
        });
    });
}

module.exports = Template;
