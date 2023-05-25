import type { CFNConfigClient } from '../index.js';
import assert from 'assert';
import path from 'path';
import jsonDiff from 'json-diff';
import stableStringify from 'json-stable-stringify';
import { diffLines } from 'diff';
import Table from 'easy-table';
import Actions from './actions.js';
import type { ChangeSetDetail, ChangeSetDetailChange } from './actions.js';
import Lookup from './lookup.js';
import Prompt from './prompt.js';
import TemplateReader from './template.js';
import { Template, CloudFormationTemplate } from './template.js';
import type {
    Tag,
    Parameter
} from '@aws-sdk/client-cloudformation';

import 'colors';

export interface CommandOptions {
    base?: string;
    name?: string;
    tags?: Tag[];
    configBucket?: string;
    templateBucket?: string;
}

export interface CommandOverrides {
    parameters?: Map<string, string>;
}

/**
 * Provides a set of commands for interacting with a CloudFormation stack
 * @class
 *
 * This bucket must be in the same region as the stack.
 */
class Commands {
    client: CFNConfigClient;
    config: CommandOptions;
    dryrun: boolean;

    constructor(client: CFNConfigClient, config: CommandOptions = {}, dryrun = false) {
        this.client = client;
        this.config = config;
        this.dryrun = dryrun;
    }

    /**
     * Create a new CloudFormation stack. The user will be prompted to:
     *   - select an existing saved configuration or start from scratch
     *   - input stack parameter values, with prompting defaults provided by the
     *     selected configuration
     *   - confirm stack creation and monitor events during creation
     *
     * @param suffix - the trailing part of the new stack's name
     * @param template - either the template as object or the filesystem path to the template file to load
     */
    async create(suffix: string, template: string | object, overrides: CommandOverrides = {}) {
        const context = new CommandContext(
            this.client,
            this.config,
            overrides,
            suffix,
            [
                Operations.createPreamble,
                Operations.selectConfig,
                Operations.loadConfig,
                Operations.promptParameters,
                Operations.confirmCreate,
                Operations.saveTemplate,
                Operations.validateTemplate,
                Operations.getChangesetCreate,
                Operations.executeChangeSet,
                Operations.monitorStack,
                Operations.saveConfig
            ]
        );

        context.template = template;

        if (this.dryrun) return context;
        await context.run();
    }

    /**
     * Update an existing CloudFormation stack. The user will be prompted to:
     *   - input stack parameter values, with prompting defaults provided by the
     *     values on the existing stack
     *   - confirm changes that will be made to parameter values
     *   - confirm changes that will be made to the template itself
     *   - confirm changes that will be made to existing stack resources
     *   - monitor events during the update
     *
     * @param suffix - the trailing part of the new stack's name
     * @param template - either the template as object or the filesystem path to the template file to load
     */
    async update(suffix: string, template: string | object, overrides: CommandOverrides = {}) {
        const context = new CommandContext(
            this.client,
            this.config,
            overrides,
            suffix,
            [
                Operations.updatePreamble,
                Operations.promptParameters,
                Operations.confirmParameters,
                Operations.confirmTemplate,
                Operations.saveTemplate,
                Operations.validateTemplate,
                Operations.getChangesetUpdate,
                Operations.confirmChangeset,
                Operations.executeChangeSet,
                Operations.monitorStack,
                Operations.saveConfig
            ]
        );

        context.template = template;

        if (this.dryrun) return context;
        await context.run();
    }

    /**
     * Delete an existing CloudFormation stack. The user will be prompted to:
     *   - confirm the deletion of the stack
     *   - monitor events during the deletion
     *
     * @param suffix - the trailing part of the existing stack's name
     */
    async delete(suffix: string, overrides: CommandOverrides = {}) {
        const context = new CommandContext(
            this.client,
            this.config,
            overrides,
            suffix,
            [
                Operations.confirmDelete,
                Operations.deleteStack,
                Operations.monitorStack
            ]
        );

        if (this.dryrun) return context;
        await context.run();
    }

    /**
     * Cancel an update to a CloudFormation stack, rolling it back
     *
     * @param suffix - the trailing part of the stack's name
     */
    async cancel(suffix: string, overrides: CommandOverrides = {}) {
        const context = new CommandContext(
            this.client,
            this.config,
            overrides,
            suffix,
            [
                Operations.cancelStackDeploy,
                Operations.monitorStack
            ]
        );

        if (this.dryrun) return context;
        await context.run();
    }

    /**
     * Lookup information about an existing stack.
     *
     * @param {string} suffix - the trailing part of the existing stack's name
     * @param {boolean} [resources=false] - if set to `true`, returned information
     * will include details of each resource in the stack
     */
    async info(suffix: string, resources = false) {
        if (this.dryrun) return true;
        const lookup = new Lookup(this.client);
        return await lookup.info(stackName(this.config.name, suffix), resources);
    }

    /**
     * Save an existing stack's parameter values to S3. The user will be prompted
     * to provide a name for the saved configuration, and confirm the set of
     * parameters that will be saved.
     *
     * @param {string} suffix - the trailing part of the new stack's name
     */
    async save(suffix: string, overrides: CommandOverrides) {
        const context = new CommandContext(
            this.client,
            this.config,
            overrides,
            suffix,
            [
                Operations.getOldParameters,
                Operations.promptSaveConfig,
                Operations.confirmSaveConfig,
                Operations.saveConfig
            ]
        );

        if (this.dryrun) return context;
        await context.run();
    }
}

/**
 * Generates context for high-level functions and steps through the defined operations.
 *
 * @class
 * @private
 * @param {object} config - configurations options provided to the commands factory
 * @param {string} suffix - the trailing part of a stack's name
 * @param {array} operations - and array of operation functions that will be
 * called in order to build the desired deployment flow.
 */
class CommandContext {
    client: CFNConfigClient;
    config: CommandOptions;
    baseName: string;
    suffix: string;
    stackName: string;
    stackRegion: string;
    configBucket: string;
    templateBucket: string;
    oldTemplate: Template;
    newTemplate: Template;
    overrides: {
        parameters: Map<string, string>;
    };

    changeset?: ChangeSetDetail;
    changesetParameters?: Parameter[];
    diffs: any;
    saveName?: string;
    configNames?: string[];
    configName?: string;
    create?: boolean;
    tags: Tag[];
    operations: function[];

    template?: string | object;
    templateUrl?: string;

    constructor(
        client: CFNConfigClient,
        config: CommandOptions,
        overrides: CommandOverrides,
        suffix: string,
        operations: function[])
    {
        this.client = client;
        this.config = config;
        this.baseName = config.name;
        this.suffix = suffix;
        this.stackName = stackName(config.name, suffix);
        this.configBucket = config.configBucket;
        this.templateBucket = config.templateBucket;
        this.diffs = {};
        this.tags = config.tags || [];

        this.oldTemplate = new Template();
        this.newTemplate = new Template();

        if (!overrides) overrides = {};
        this.overrides = {
            parameters: overrides.parameters || new Map()
        }

        this.operations = operations;
    }

    async run() {
        try {
            for (const op of this.operations) {
                await op(this);
            }
        } catch (err) {
            if (err.message === 'aborted') return false;
            throw err;
        }

        return true;
    }
}

/**
 * Individual operations that are composed into high-level commands. Each function
 * is provided a context object and should fire `.next()` on success or `.abort(err)`
 * if some failure occurred.
 *
 * @private
 * @class
 */
class Operations {
    static async updatePreamble(context: CommandContext) {
        const template = new TemplateReader(context.client);

        try {
            if (!context.template) {
                throw new TemplateReader.NotFoundError('No template passed');
            } else if (typeof context.template === 'string') {
                context.newTemplate = await template.read(
                    new URL(path.resolve(context.template), 'file://')
                );
            } else {
                // we assume if template is not string, it's a pre-loaded template body object
                context.newTemplate = new Template(context.template as CloudFormationTemplate);
            }

            const lookup = new Lookup(context.client);
            context.oldTemplate = await lookup.template(context.stackName);
            context.oldTemplate.parameters = await lookup.parameters(context.stackName);
        } catch (err) {
            let msg = '';
            if (err instanceof TemplateReader.NotFoundError) msg += 'Could not load template: ';
            if (err instanceof TemplateReader.InvalidTemplateError) msg += 'Could not parse template: ';
            if (err instanceof Lookup.StackNotFoundError) msg += 'Missing stack: ';
            if (err instanceof Lookup.CloudFormationError) msg += 'Failed to find existing stack: ';
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }

    static async promptParameters(context: CommandContext) {
        const template = new TemplateReader(context.client);

        const parameters = new Map([...context.oldTemplate.parameters, ...context.overrides.parameters]);

        const questions = template.questions(
            context.newTemplate,
            parameters
        );

        const answers = await Prompt.parameters(questions);

        context.newTemplate.parameters = answers;
        context.changesetParameters = changesetParameters(
            context.oldTemplate.parameters,
            context.newTemplate.parameters,
            context.create
        );

        return;
    }

    static async confirmParameters(context: CommandContext) {
        const diff = compareParameters(context.oldTemplate, context.newTemplate);

        if (!diff) return;

        const ready = await Prompt.confirm([diff, 'Accept parameter changes?'].join('\n'));
        if (!ready) throw new Error('aborted');
        context.diffs.parameters = diff;

        return;
    }

    static async confirmTemplate(context: CommandContext) {
        const diff = compareTemplate(context.oldTemplate, context.newTemplate);

        if (!diff) return;

        const ready = await Prompt.confirm([diff, 'Accept template changes?'].join('\n'));
        if (!ready) throw new Error('aborted');
        context.diffs.template = diff;

        return;
    }

    static async saveTemplate(context: CommandContext) {
        const actions = new Actions(context.client);
        context.templateUrl = await actions.templateUrl(context.templateBucket, context.suffix);

        try {
            await actions.saveTemplate(context.templateUrl, stableStringify(context.newTemplate.body, { space: 2 }));
        } catch (err) {
            let msg = '';
            if (err instanceof Actions.BucketNotFoundError) msg += 'Could not find template bucket: ';
            if (err instanceof Actions.S3Error) msg += 'Failed to save template: ';
            msg += err.message;
            err.message = msg;
            throw err;
        }

        return;
    }

    static async cancelStackDeploy(context: CommandContext) {
        const actions = new Actions(context.client);
        try {
            await actions.cancel(context.stackName);
        } catch (err) {
            let msg = '';
            msg += err.message;
            err.message = msg;
            throw err;
        }

        return;
    }

    static async validateTemplate(context: CommandContext) {
        const actions = new Actions(context.client);
        try {
            await actions.validate(context.templateUrl);
        } catch (err) {
            let msg = 'Invalid template: '; // err instanceof Actions.CloudFormationError
            msg += err.message;
            err.message = msg;
            throw err;
        }

        return;
    }

    static async getChangesetCreate(context: CommandContext) {
        await Operations.getChangeset(context, 'CREATE');
    }

    static async getChangesetUpdate(context: CommandContext) {
        await Operations.getChangeset(context, 'UPDATE');
    }

    static async getChangeset(context: CommandContext, changeSetType: string) {
        const actions = new Actions(context.client);
        try {
            const details = await actions.diff(
                context.stackName,
                changeSetType,
                context.templateUrl,
                context.changesetParameters,
                context.tags
            );

            context.changeset = details;
        } catch (err) {
            let msg = 'Failed to generate changeset: '; // err instanceof Actions.CloudFormationError
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }

    static async confirmChangeset(context: CommandContext) {
        const msg = [
            formatDiff(context.changeset),
            'Accept changes and update the stack?'
        ].join('\n');

        const ready = await Prompt.confirm(msg, false);
        if (!ready) throw new Error('aborted');
    }

    static async executeChangeSet(context: CommandContext) {
        const actions = new Actions(context.client);
        try {
            await actions.executeChangeSet(context.stackName, context.changeset.id);
        } catch (err) {
            let msg = '';
            if (err instanceof Actions.CloudFormationError) msg += 'Failed to execute changeset: ';
            if (err instanceof Actions.ChangeSetNotExecutableError) msg += 'Status: ' + err.execution + ' | Reason: ' + err.reason + ' | ';
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }

    static async createPreamble(context: CommandContext) {
        const template = new TemplateReader(context.client);
        context.create = true;

        try {
            if (!context.template) {
                throw new TemplateReader.NotFoundError('No template passed');
            } else if (typeof context.template === 'string') {
                context.newTemplate = await template.read(
                    new URL(path.resolve(context.template), 'file://')
                );
            } else {
                // we assume if template is not string, it's a pre-loaded template body object
                context.newTemplate = new Template(context.template as CloudFormationTemplate);
            }

            const lookup = new Lookup(context.client);
            context.configNames = await lookup.configurations(context.baseName, context.configBucket);
        } catch (err) {
            let msg = '';
            if (err instanceof TemplateReader.NotFoundError) msg += 'Could not load template: ';
            if (err instanceof TemplateReader.InvalidTemplateError) msg += 'Could not parse template: ';
            if (err instanceof Lookup.BucketNotFoundError) msg += 'Could not find config bucket: ';
            if (err instanceof Lookup.S3Error) msg += 'Could not load saved configurations: ';
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }

    static async selectConfig(context: CommandContext) {
        const savedConfig = await Prompt.configuration(context.configNames);
        if (savedConfig === 'New configuration') return;

        context.configName = savedConfig;

        return;
    }

    static async loadConfig(context: CommandContext) {
        if (!context.configName) return;

        const lookup = new Lookup(context.client);

        try {
            const info = await lookup.configuration(context.baseName, context.configBucket, context.configName);
            context.oldTemplate.parameters = info;
        } catch (err){
            let msg = '';
            if (err instanceof Lookup.BucketNotFoundError) msg += 'Could not find config bucket: ';
            if (err instanceof Lookup.ConfigurationNotFoundError) msg += 'Could not find saved configuration: ';
            if (err instanceof Lookup.InvalidConfigurationError) msg += 'Saved configuration error: ';
            if (err instanceof Lookup.S3Error) msg += 'Failed to read saved configuration: ';
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }

    static async confirmCreate(context: CommandContext) {
        const ready = await Prompt.confirm('Ready to create the stack?');
        if (!ready) throw new Error('aborted');
    }

    static async confirmDelete(context: CommandContext) {
        const msg = 'Are you sure you want to delete ' + context.stackName + ' in region ' + context.client.region + '?';
        const ready = await Prompt.confirm(msg, false);
        if (!ready) throw new Error('aborted');
    }

    static async deleteStack(context: CommandContext) {
        const actions = new Actions(context.client);
        try {
            await actions.delete(context.stackName);
        } catch (err) {
            let msg = 'Failed to delete stack: '; // err instanceof Actions.CloudFormationError
            msg += err.message;
            err.message = msg;

            throw err;
        }
    }

    static async monitorStack(context: CommandContext) {
        const actions = new Actions(context.client);
        try {
            await actions.monitor(context.stackName);
        } catch (err) {
            err.failure = err.message;
            err.message = `Monitoring your deploy failed, but the deploy in region ${context.client.region} will continue. Check on your stack's status in the CloudFormation console.`;
            throw err;
        }
    }

    static async getOldParameters(context: CommandContext) {
        const lookup = new Lookup(context.client);
        try {
            const info = await lookup.parameters(context.stackName);
            context.oldTemplate.parameters = info;
        } catch (err) {
            let msg = '';
            if (err instanceof Lookup.StackNotFoundError) msg += 'Missing stack: ';
            if (err instanceof Lookup.CloudFormationError) msg += 'Failed to find existing stack: ';
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }

    static async promptSaveConfig(context: CommandContext) {
        const name = await Prompt.input('Name for saved configuration:', context.suffix);
        context.saveName = name;
    }

    static async confirmSaveConfig(context: CommandContext) {
        process.stdout.write(stableStringify(context.oldTemplate.parameters, { space: 2 }) + '\n\n');
        const ready = await Prompt.confirm('Ready to save this configuration as "' + context.saveName + '"?');
        if (!ready) throw new Error('aborted');
    }

    static async saveConfig(context: CommandContext) {
        const actions = new Actions(context.client);

        try {
            await actions.saveConfiguration(
                context.baseName,
                context.stackName,
                context.configBucket,
                context.newTemplate.parameters
            );
        } catch (err) {
            let msg = '';
            if (err instanceof Actions.BucketNotFoundError) msg += 'Could not find template bucket: ';
            if (err instanceof Actions.S3Error) msg += 'Failed to save template: ';
            msg += err.message;
            err.message = msg;
            throw err;
        }
    }
}

function compareParameters(existing: Template, desired: Template) {
    existing = JSON.parse(JSON.stringify(Object.fromEntries(existing.parameters)));
    desired = JSON.parse(JSON.stringify(Object.fromEntries(desired.parameters)));
    try {
        assert.deepEqual(existing, desired);
        return;
    } catch (err) {
        return jsonDiff.diffString(existing, desired);
    }
}

function compareTemplate(existing: Template, desired: Template) {
    const existingstr = stableStringify(existing.body, { space: 2 });
    const desiredstr = stableStringify(desired.body, { space: 2 });

    try {
        assert.equal(existingstr, desiredstr);
        return;
    } catch (err) {
        const strDiff = diffLines(existingstr, desiredstr, {
            ignoreWhitespace: true
        });

        let diffText = '';

        strDiff.forEach((part, i) => {
            const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
            const delimiter = '\n---------------------------------------------\n\n';

            if (color === 'grey') {
                const lines = part.value.split('\n').slice(0, -1);
                if (lines.length > 10) {
                    const first = lines.slice(0, 3).map((line: string) => ` ${line}`);
                    const last = lines.slice(-3).map((line: string) => ` ${line}`);
                    if (i !== 0) diffText += `${first.join('\n')}\n`.grey;
                    if (i !== 0 && i !== strDiff.length - 1) diffText += delimiter.grey;
                    if (i !== strDiff.length - 1) diffText += `${last.join('\n')}\n`.grey;
                    return;
                }
            }

            const toPrint = part.value
                .split('\n')
                .map((line) => `${!line.length ? '' : part.added ? '+' : part.removed ? '-' : ' '}${line}`)
                .join('\n')[color];

            diffText += toPrint;
        });

        return diffText;
    }
}

function formatDiff(details: ChangeSetDetail): string {
    const t = new Table();

    function colors(msg: string) {
        if (msg === 'Modify') return msg.yellow;
        if (msg === 'Add') return msg.green;
        if (msg === 'Remove') return msg.red;
        if (msg === 'true') return msg.red;
        if (msg === 'false') return msg.green;
        return msg;
    }

    details.changes.forEach((change: ChangeSetDetailChange) => {
        t.cell('Action', colors(change.action));
        t.cell('Name', colors(change.name));
        t.cell('Type', colors(change.type));
        t.cell('Replace', colors(change.replacement.toString()));
        t.newRow();
    });

    return t.toString();
}

function stackName(name: string, suffix?: string) {
    return suffix ? name + '-' + suffix : name;
}

/**
 * Build parameters object for CloudFormation requests
 *
 * @private
 * @param oldParameters - name/value pairs defining old or default parameters
 * @param newParameters - name/value pairs defining the new, unchanged old, or accepted default parameters
 * @param isCreate - indicates that UsePreviousValue shoudld not be used on stack create. set in createPreable().
 * @returns {array} params - parameters objects for use in ChangeSet requests that create/update a stack
 */
function changesetParameters(
    oldParameters: Map<string, string>,
    newParameters: Map<string, string>,
    isCreate: boolean
): Parameter[]  {
    return Array.from(newParameters.keys()).map((key) => {
        const parameter: Parameter = {
            ParameterKey: key
        };

        const unchanged = oldParameters.get(key) === newParameters.get(key);

        if (isCreate) {
            parameter.ParameterValue = newParameters.get(key);
        } else if (unchanged) {
            parameter.UsePreviousValue = true;
        } else {
            parameter.ParameterValue = newParameters.get(key);
        }

        return parameter;
    });
}

export {
    Commands,
    CommandContext,
    Operations
};
