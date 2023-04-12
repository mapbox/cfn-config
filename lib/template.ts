import fs from 'fs/promises';
import type { CFNConfigClient } from '../index.js';
import s3urls from '@openaddresses/s3urls';
import {
    S3Client,
    GetObjectCommand,
    GetBucketLocationCommand
} from '@aws-sdk/client-s3';

export interface CloudFormationTemplate {
    Description?: string;
    Parameters?: {
        [x: string]: {
            Type: string;
            Default?: string;
            Description?: string;
            AllowedPattern?: string;
            AllowedValues: string[];
            [x: string]: unknown;
        };
    };
    Resources?: {
        [x: string]: object;
    };
    Metadata?: object;
    Outputs?: object;
    Mappings?: object;
    [x: string]: unknown;
}

export class Template {
    body: CloudFormationTemplate;
    parameters: Map<string, string>
    constructor(body: CloudFormationTemplate = {}) {
        if (!body.Description) body.Description = '';
        if (!body.Parameters) body.Parameters = {};
        if (!body.Resources) body.Resources = {};
        if (!body.Outputs) body.Resources = {};

        this.body = body;

        this.parameters = new Map();
    }
}

class NotFoundError extends Error {}
class InvalidTemplateError extends Error {}
class KmsError extends Error {}

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
     * @param templatePath - the absolute path to a local file or an S3 url
     * @param [options] - an object to pass as the first argument to async templates
     */
    async read(templatePath: URL, options?: any): Promise<Template> {
        if (!(templatePath instanceof URL)) throw new Error('templatePath must be of type URL');

        const params = s3urls.fromUrl(String(templatePath));

        if (!params.Bucket || !params.Key) {
            try {
                await fs.stat(templatePath);
            } catch (err) {
                throw new TemplateReader.NotFoundError(`${templatePath} does not exist`);
            }

            let templateBody;

            if (!/\.js$/.test(String(templatePath))) {
                templateBody = String(await fs.readFile(templatePath));

                try {
                    templateBody = JSON.parse(templateBody);
                } catch (err) {
                    throw new TemplateReader.InvalidTemplateError(`Failed to parse ${templatePath}: ${err.message}`);
                }

                return new Template(templateBody);
            }

            try {
                templateBody = (await import(templatePath.pathname)).default;
            } catch (err) {
                throw new TemplateReader.InvalidTemplateError(`Failed to parse ${templatePath}: ${err.message}`);
            }

            if (typeof templateBody === 'function') {
                return new Template(await templateBody(options));
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
                throw new TemplateReader.NotFoundError(`${templatePath} could not be loaded - S3 responded with ${err.message}`);
            }

            s3 = new S3Client(this.client);

            try {
                data = await s3.send(new GetObjectCommand(params));
            } catch (err) {
                throw new TemplateReader.NotFoundError(`${templatePath} could not be loaded - S3 responded with ${err.message}`);
            }

            let templateBody;
            try {
                templateBody = JSON.parse(data.Body.toString());
            } catch (err) {
                throw new TemplateReader.InvalidTemplateError(`Failed to parse ${templatePath}`);
            }

            return new Template(templateBody);
        }
    }

    /**
     * Create questions for each Parameter in a CloudFormation template
     *
     * @param {object} templateBody - a parsed CloudFormation template
     */
    questions(template: Template, defaults: Map<string, string> = new Map()) {
        return Object.keys(template.body.Parameters).map((name: string) => {
            const parameter = template.body.Parameters[name];

            const question: any = {};
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

            question.validate = (input: string) => {
                let valid = true;
                if ('MinLength' in parameter) valid = valid && input.length >= Number(parameter.MinLength);
                if ('MaxLength' in parameter) valid = valid && input.length <= Number(parameter.MaxLength);
                if ('MinValue' in parameter) valid = valid && Number(input) >= Number(parameter.MinValue);
                if ('MaxValue' in parameter) valid = valid && Number(input) <= Number(parameter.MaxValue);
                if (parameter.AllowedPattern) valid = valid && (new RegExp(parameter.AllowedPattern)).test(input);
                if (parameter.Type === 'List<Number>') valid = valid && input.split(',').every((num) => {
                    return !isNaN(parseFloat(num));
                });

                return valid;
            };

            if (defaults.has(name)) {
                if (!question.choices || question.choices.indexOf(defaults.get(name)) !== -1) {
                    question.default = defaults.get(name);
                }
            }

            return question;
        });
    }
}
