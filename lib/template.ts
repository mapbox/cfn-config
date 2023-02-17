import fs from 'fs/promises';
import type { CFNConfigClient } from '../index.js';
// @ts-ignore
import s3urls from '@openaddresses/s3urls';
import {
    S3Client,
    GetObjectCommand,
    GetBucketLocationCommand
} from '@aws-sdk/client-s3';

export class Template {
    Description?: string;
    Parameters?: Map<string, string>;
    Resources?: object;
    Metadata?: object;
    Outputs?: object;
    [x: string]: unknown;

    constructor(raw) {
        Object.assign(this, raw);
    }

    json(): object {
        return
    }
}

class NotFoundError extends Error {};
class InvalidTemplateError extends Error {};
class KmsError extends Error {};

/**
 * @class
 * Cloudformation Template
 */
export default class TemplateReader {
    client: CFNConfigClient;

    constructor(client: CFNConfigClient) {
        this.client = client;
    }

    static NotFoundError = NotFoundError;
    static InvalidTemplateError = InvalidTemplateError;
    static KmsError = KmsError;

    /**
     * Read a template from a local file or from S3
     *
     * @param {URL} templatePath - the absolute path to a local file or an S3 url
     * @param {object} [options] - an object to pass as the first argument to async templates
     */
    async read(templatePath: string, options?={}): Template {
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

                return new Template(templateBody);
            }

            try {
                templateBody = (await import(templatePath)).default;
            } catch (err) {
                throw new Template.InvalidTemplateError('Failed to parse %s: %s', templatePath, err.message);
            }

            if (typeof templateBody === 'function') {
                return await async(templateBody, options);
            } else {
                return new Template(templateBody);
            }
        } else {
            let s3 = new S3Client(this.client);

            let data;
            try {
                data = await s3.send(new GetBucketLocationCommand({
                    Bucket: params.Bucket
                }));
            } catch (err) {
                throw new Template.NotFoundError('%s could not be loaded - S3 responded with %s: %s', templatePath, err.code, err.message);
            }

            s3 = new S3Client(this.client);

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

            return new Template(templateBody);
        }
    }

    /**
     * Create questions for each Parameter in a CloudFormation template
     *
     * @param {object} templateBody - a parsed CloudFormation template
     * @returns {array} a set of questions for user prompting
     */
    questions(templateBody: object) {
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

            return question;
        });
    }
}
