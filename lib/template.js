const fs = require('fs');
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
     * @param {function} callback - a function to receive the template as a JSON object
     */
    static read(templatePath, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        const params = s3urls.fromUrl(templatePath);

        if (!params.Bucket || !params.Key) {
            return fs.stat(templatePath, (err) => {
                if (err) return callback(new Template.NotFoundError('%s does not exist', templatePath));

                var templateBody;

                if (!/\.js$/.test(templatePath)) {
                    templateBody = fs.readFileSync(templatePath);
                    try { templateBody = JSON.parse(templateBody); }
                    catch (err) { return callback(new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message)); }
                    return callback(null, templateBody);
                }

                try { templateBody = require(path.resolve(templatePath)); }
                catch (err) { return callback(new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message)); }

                if (typeof templateBody === 'function') templateBody(options, callback);
                else callback(null, templateBody);
            });
        }

        function s3error(err, callback) {
            callback(new Template.NotFoundError(
                '%s could not be loaded - S3 responded with %s: %s',
                templatePath, err.code, err.message
            ));
        }

        let s3 = new AWS.S3({ signatureVersion: 'v4' });

        s3.getBucketLocation({
            Bucket: params.Bucket
        }, (err, data) => {
            if (err) return s3error(err, callback);

            s3 = new AWS.S3({
                region: data.LocationConstraint || undefined
            });

            s3.getObject(params, function(err, data) {
                if (err) return s3error(err, callback);

                var templateBody;
                try { templateBody = JSON.parse(data.Body.toString()); }
                catch (err) { return callback(new Template.InvalidTemplateError('Failed to parse %s', templatePath)); }

                callback(null, templateBody);
            });
        });
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
            var parameter = templateBody.Parameters[name];

            var question = {};
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
                var valid = true;
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

            question.filter = (input) => {
                var done = this.async();

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

module.exports = Template;
