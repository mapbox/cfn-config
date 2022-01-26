/* eslint-disable no-console */
const assert = require('assert');
const path = require('path');
const jsonDiff = require('json-diff');
const stableStringify = require('json-stable-stringify');
const Diff = require('diff');
const Table = require('easy-table');
const Actions = require('./actions');
const Lookup = require('./lookup');
const Prompt = require('./prompt');
const Template = require('./template');
const d3 = require('d3-queue');
const AWS = require('aws-sdk');

const NOECHO_MASK = '****';

require('colors');


/**
 * Override various aspects of the deployment chain
 *
 * @name overrides
 * @property {object} [parameters] - provide default values for parameters
 * during prompting
 * @property {boolean} [force] - do not prompt user for any input -- accept all
 * default values
 * @property {object} [templateOptions] - an options object to provide as the
 * first argument to a JavaScript template which exports a function
 * @property {function} [beforeUpdate] - a hook into the update flow that allows
 * the caller to inject functionality into the flow after the user has specified
 * configuration, but before the update has occurred. The function will be provided
 * with a `context` object containing information about the intended stack
 * configuration, and a callback function to fire when all before-update functionality
 * has been accomplished
 * @property {string} [defaultConfig] - the url for a default configuration
 * object on S3. If provided, this configuration will be used by new stacks that
 * select the "New configuration" option during the prompting phase.
 * @property {string|boolean} [kms] - either `true` if you wish to use the
 * default KMS key (id `alias/cloudformation`) for parameter encryption and
 * at-rest configuration encryption, or a string indicating the id of the KMS
 * key that should be used.
 * @property {object} [metadata] - an object of additional metadata to merge
 * into the template metadata.
 */

/**
 * Provides a set of commands for interacting with a CloudFormation stack
 * @class
 *
 * @param {object} config
 * @param {string} config.name - the base name of the stack (no suffix)
 * @param {string} config.region - the region the stack resides, or will reside in
 * @param {string} config.configBucket - the bucket that contains saved configurations
 * @param {string} config.templateBucket - the bucket where templates can be stored.
 * This bucket must be in the same region as the stack.
 */
class Commands {
    constructor(config) {
        this.config = config;
    }

    /**
     * Create a new CloudFormation stack. The user will be prompted to:
     *   - select an existing saved configuration or start from scratch
     *   - input stack parameter values, with prompting defaults provided by the
     *     selected configuration
     *   - confirm stack creation and monitor events during creation
     *
     * @param {string} suffix - the trailing part of the new stack's name
     * @param {string} template - either the template as object or the filesystem path to the template file to load
     * @param {@link overrides} [overrides] - any overrides to the create flow
     */
    async create(suffix, template, overrides={}) {
        var context = commandContext(this.config, suffix, [
            operations.createPreamble,
            operations.selectConfig,
            operations.loadConfig,
            operations.promptParameters,
            operations.validateParametersHook,
            operations.confirmCreate,
            operations.mergeMetadata,
            operations.saveTemplate,
            operations.validateTemplate,
            operations.getChangesetCreate,
            operations.executeChangeSet,
            operations.monitorStack,
            operations.saveConfig
        ], callback);

        context.overrides = overrides;
        context.template = template;
        context.next();
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
     * @param {string} suffix - the trailing part of the new stack's name
     * @param {string} template - either the template as object or the filesystem path to the template file to load
     * @param {@link overrides} [overrides] - any overrides to the create flow
     */
    async update(suffix, template, overrides={}) {
        var operationsArray = [
            operations.updatePreamble,
            operations.getMasterConfig,
            operations.promptParameters,
            operations.confirmParameters,
            operations.validateParametersHook,
            operations.mergeMetadata,
            operations.confirmTemplate,
            operations.saveTemplate,
            operations.validateTemplate,
            operations.beforeUpdateHook,
            operations.getChangesetUpdate,
            operations.confirmChangeset,
            operations.executeChangeSet,
            operations.monitorStack,
            operations.saveConfig
        ];

        var context = commandContext(config, suffix, operationsArray, callback);

        context.overrides = overrides;
        context.template = template;
        context.next();
    }

    /**
     * Delete an existing CloudFormation stack. The user will be prompted to:
     *   - confirm the deletion of the stack
     *   - monitor events during the deletion
     *
     * @param {string} suffix - the trailing part of the existing stack's name
     * @param {@link overrides} [overrides] - any overrides to the create flow
     */
    async delete(suffix, overrides={}) {
        var context = commandContext(config, suffix, [
            operations.confirmDelete,
            operations.deleteStack,
            operations.monitorStack
        ], callback);

        context.overrides = overrides;
        context.next();
    }

    /**
     * Lookup information about an existing stack.
     *
     * @param {string} suffix - the trailing part of the existing stack's name
     * @param {boolean} [resources=false] - if set to `true`, returned information
     * will include details of each resource in the stack
     * @param {boolean} [decrypt=false] - return secure parameters decrypted
     */
    async info(suffix, resources=false, decrypt=false) {
        await Lookup.info(stackName(config.name, suffix), config.region, resources, decrypt);
    }

    /**
     * Save an existing stack's parameter values to S3. The user will be prompted
     * to provide a name for the saved configuration, and confirm the set of
     * parameters that will be saved.
     *
     * @param {string} suffix - the trailing part of the new stack's name
     * @param {string|boolean} [kms=false] - if specified, this KMS key id will
     * be used to encrypt the contents of the file at-rest on S3.
     */
    async save(suffix, kms) {
        if (typeof kms === 'function') {
            callback = kms;
            kms = false;
        }

        var context = commandContext(config, suffix, [
            operations.getOldParameters,
            operations.promptSaveConfig,
            operations.confirmSaveConfig,
            operations.saveConfig
        ], callback);

        context.kms = kms;
        context.next();
    }
}

/**
 * Generates context for high-level functions and steps through the defined operations.
 *
 * @private
 * @param {object} config - configurations options provided to the commands factory
 * @param {string} suffix - the trailing part of a stack's name
 * @param {array} operations - and array of operation functions that will be
 * called in order to build the desired deployment flow.
 * @param {function} callback - a function fired when all operations are complete
 * @return {object} context - information passed from operation to operation
 */
function commandContext(config, suffix, operations, callback) {
    let i = -1;

    const context = {
        baseName: config.name,
        suffix: suffix,
        stackName: stackName(config.name, suffix),
        stackRegion: config.region,
        configBucket: config.configBucket,
        templateBucket: config.templateBucket,
        overrides: {},
        oldParameters: {},
        diffs: {},
        abort: (err) => {
            if (err) callback(err, false);
            else callback(null, false);
        },
        next: () => {
            i++;
            const operation = operations[i];
            if (!operation) return callback(null, true, context.diffs);
            operation(context);
        }
    };

    return context;
}

/**
 * Individual operations that are composed into high-level commands. Each function
 * is provided a context object and should fire `.next()` on success or `.abort(err)`
 * if some failure occurred.
 *
 * @private
 */
const operations = module.exports.operations = {
    updatePreamble: function(context) {
        var preamble = d3.queue();

        if (!context.template) {
            preamble.defer((next) => next(new Template.NotFoundError('No template passed')));
        } else if (typeof context.template === 'string') {
            preamble.defer(
                Template.read,
                path.resolve(context.template),
                context.overrides.templateOptions
            );
        } else {
            // we assume if template is not string, it's a pre-loaded template body object
            preamble.defer((next) => next(null, context.template));
        }

        preamble.defer(lookup.parameters, context.stackName, context.stackRegion);
        preamble.defer(lookup.template, context.stackName, context.stackRegion);
        preamble.await(function(err, templateBody, oldParams, oldTemplate) {
            if (err) {
                var msg = '';
                if (err instanceof Template.NotFoundError) msg += 'Could not load template: ';
                if (err instanceof Template.InvalidTemplateError) msg += 'Could not parse template: ';
                if (err instanceof lookup.StackNotFoundError) msg += 'Missing stack: ';
                if (err instanceof lookup.CloudFormationError) msg += 'Failed to find existing stack: ';
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.newTemplate = templateBody;
            context.oldTemplate = oldTemplate;
            context.oldParameters = oldParams;

            context.next();
        });
    },

    getMasterConfig: function(context) {
        if (!context.overrides.masterConfig) return context.next();
        var s3Url = context.overrides.masterConfig;

        Lookup.defaultConfiguration(s3Url, (err, masterConfigJSON) => {
            if (err) return context.abort();
            Object.keys(masterConfigJSON).forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(context.oldParameters, key)) {
                    if (context.oldParameters[key].indexOf('secure') > -1) {
                        var kms = new AWS.KMS({
                            region: context.stackRegion,
                            maxRetries: 10
                        });
                        var valueToDecrypt = context.oldParameters[key].replace(/^secure:/, '');
                        kms.decrypt({
                            CiphertextBlob: new Buffer(valueToDecrypt, 'base64')
                        }, (err, data) => {
                            if (err) return context.abort();
                            var decryptedOldParams = new Buffer(data.Plaintext, 'base64').toString('utf-8');
                            var decryptedMaster = masterConfigJSON[key];
                            if (decryptedOldParams !== decryptedMaster) {
                                context.oldParameters[key] = masterConfigJSON[key];
                            }
                        });
                    }
                }
            });
            context.next();
        });
    },

    promptParameters: async function(context) {
        var newTemplateParameters = context.newTemplate.Parameters || {};
        var overrideParameters = {};

        if (context.overrides.parameters) {
            Object.keys(context.overrides.parameters).forEach(function(key){
                if (newTemplateParameters[key] || context.oldParameters[key])
                    overrideParameters[key] = context.overrides.parameters[key];
            });
        }

        if (context.overrides.force || context.overrides.skipPromptParameters) {
            context.newParameters = {};
            Object.keys(newTemplateParameters).forEach(function(key) {
                const value = key in overrideParameters ? overrideParameters[key] : context.oldParameters[key];
                if (value !== undefined) {
                    context.newParameters[key] = value;
                }
            });
            context.changesetParameters = changesetParameters(
                context.oldParameters,
                context.newParameters,
                overrideParameters,
                context.create
            );
            return context.next();
        }
        else {
            Object.assign(context.oldParameters, overrideParameters);
        }

        var questions = Template.questions(context.newTemplate, {
            defaults: context.oldParameters,
            region: context.stackRegion,
            kmsKeyId: context.overrides.kms
        });

        const answers = await Prompt.parameters(questions);

        context.newParameters = answers;
        context.changesetParameters = changesetParameters(
            context.oldParameters,
            context.newParameters,
            overrideParameters,
            context.create
        );
        context.next();
    },

    confirmParameters: async function(context) {
        if (context.overrides.force || context.overrides.skipConfirmParameters) {
            return context.next();
        }

        const diff = compare(context.oldParameters, context.newParameters);

        if (!diff) {
            context.overrides.skipConfirmParameters = true;
            return context.next();
        }

        if (context.overrides.preapproved && context.overrides.preapproved.parameters) {
            const preapproved = context.overrides.preapproved.parameters.filter((previous) => {
                return previous === diff;
            }).length;

            if (preapproved) {
                console.log('Auto-confirming parameter changes... Changes were pre-approved in another region.');
                context.overrides.skipConfirmParameters = true;
                return context.next();
            }
        }

        const ready = await Prompt.confirm([diff, 'Accept parameter changes?'].join('\n'));
        if (!ready) return context.abort();
        context.diffs.parameters = diff;
        context.next();
    },

    confirmTemplate: async function(context) {
        if (context.overrides.force || context.overrides.skipConfirmTemplate) {
            return context.next();
        }

        const diff = compareTemplate(context.oldTemplate, context.newTemplate);

        if (!diff) {
            context.overrides.skipConfirmTemplate = true;
            return context.next();
        }

        if (context.overrides.preapproved && context.overrides.preapproved.template) {
            const preapproved = context.overrides.preapproved.template.filter(function(previous) {
                return previous === diff;
            }).length;

            if (preapproved) {
                console.log('Auto-confirming template changes... Changes were pre-approved in another region.');
                context.overrides.skipConfirmTemplate = true;
                return context.next();
            }
        }

        const ready = await Prompt.confirm([diff, 'Accept template changes?'].join('\n'));
        if (!ready) return context.abort();
        context.diffs.template = diff;
        context.next();
    },

    saveTemplate: async function(context) {
        context.templateUrl = actions.templateUrl(context.templateBucket, context.stackRegion, context.suffix);

        try {
            await Actions.saveTemplate(context.templateUrl, stableStringify(context.newTemplate, { space: 2 }));
        } catch (err) {
            let msg = '';
            if (err instanceof Actions.BucketNotFoundError) msg += 'Could not find template bucket: ';
            if (err instanceof Actions.S3Error) msg += 'Failed to save template: ';
            msg += err.message;
            err.message = msg;
            return context.abort(err);
        }

        context.next();
    },

    validateTemplate: function(context) {
        actions.validate(context.stackRegion, context.templateUrl, function(err) {
            if (err) {
                var msg = 'Invalid template: '; // err instanceof actions.CloudFormationError
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.next();
        });
    },

    validateParametersHook: function(context) {
        if (!context.overrides.validateParameters) return context.next();

        context.overrides.validateParameters(context, function(err) {
            if (err) return context.abort(err);
            context.next();
        });
    },

    beforeUpdateHook: function(context) {
        if (!context.overrides.beforeUpdate) return context.next();

        context.overrides.beforeUpdate(context, function(err) {
            if (err) return context.abort(err);
            context.next();
        });
    },

    getChangesetCreate: function(context) {
        operations.getChangeset(context, 'CREATE');
    },

    getChangesetUpdate: function(context) {
        operations.getChangeset(context, 'UPDATE');
    },

    getChangeset: function(context, changeSetType) {
        function finished(err, details) {
            if (err) {
                var msg = 'Failed to generate changeset: '; // err instanceof actions.CloudFormationError
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.changeset = details;
            context.next();
        }

        actions.diff(
            context.stackName,
            context.stackRegion,
            changeSetType,
            context.templateUrl,
            context.changesetParameters,
            context.overrides.expand,
            finished
        );
    },

    confirmChangeset: async function(context) {
        if (context.overrides.force || (context.overrides.skipConfirmTemplate && context.overrides.skipConfirmParameters)) {
            return context.next();
        }

        var msg = [
            formatDiff(context.changeset),
            'Accept changes and update the stack?'
        ].join('\n');

        const ready = await Prompt.confirm(msg, false);
        if (!ready) return context.abort();
        context.next();
    },

    executeChangeSet: function(context) {
        actions.executeChangeSet(context.stackName, context.stackRegion, context.changeset.id, function(err) {
            if (err) {
                var msg = '';
                if (err instanceof actions.CloudFormationError) msg += 'Failed to execute changeset: ';
                if (err instanceof actions.ChangeSetNotExecutableError) msg += 'Status: ' + err.execution + ' | Reason: ' + err.reason + ' | ';
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.next();
        });
    },

    createPreamble: function(context) {
        var preamble = d3.queue();
        context.create = true;

        if (!context.template) {
            preamble.defer((next) => next(new Template.NotFoundError('No template passed')));
        } else if (typeof context.template === 'string') {
            preamble.defer(
                Template.read,
                path.resolve(context.template),
                context.overrides.templateOptions
            );
        } else {
            // we assume if template is not string, it's a pre-loaded template body object
            preamble.defer((next) => next(null, context.template));
        }

        preamble.defer(lookup.configurations, context.baseName, context.configBucket, context.stackRegion);
        preamble.await(function(err, templateBody, configs) {
            if (err) {
                var msg = '';
                if (err instanceof Template.NotFoundError) msg += 'Could not load template: ';
                if (err instanceof Template.InvalidTemplateError) msg += 'Could not parse template: ';
                if (err instanceof lookup.BucketNotFoundError) msg += 'Could not find config bucket: ';
                if (err instanceof lookup.S3Error) msg += 'Could not load saved configurations: ';
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.newTemplate = templateBody;
            context.configNames = configs;
            context.next();
        });
    },

    selectConfig: async function(context) {
        if (context.overrides.force) return context.next();

        const savedConfig = await Prompt.configuration(context.configNames);
        if (savedConfig === 'New configuration') return context.next();

        context.configName = savedConfig;
        context.next();
    },

    loadConfig: function(context) {
        function finished(err, info) {
            if (err) {
                var msg = '';
                if (err instanceof lookup.BucketNotFoundError) msg += 'Could not find config bucket: ';
                if (err instanceof lookup.ConfigurationNotFoundError) msg += 'Could not find saved configuration: ';
                if (err instanceof lookup.InvalidConfigurationError) msg += 'Saved configuration error: ';
                if (err instanceof lookup.S3Error) msg += 'Failed to read saved configuration: ';
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.oldParameters = info;
            context.next();
        }

        if (!context.configName) {
            if (context.overrides.defaultConfig) return lookup.defaultConfiguration(context.overrides.defaultConfig, finished);
            else return context.next();
        }

        lookup.configuration(context.baseName, context.configBucket, context.configName, finished);
    },

    confirmCreate: async function(context) {
        if (context.overrides.force) return context.next();

        const ready = await Prompt.confirm('Ready to create the stack?');
        if (!ready) return context.abort();
        context.next();
    },

    confirmDelete: async function(context) {
        if (context.overrides.force) return context.next();
        const msg = 'Are you sure you want to delete ' + context.stackName + ' in region ' + context.stackRegion + '?';
        const ready = await Prompt.confirm(msg, false);
        if (!ready) return context.abort();
        context.next();
    },

    deleteStack: function(context) {
        actions.delete(context.stackName, context.stackRegion, function(err) {
            if (err) {
                var msg = 'Failed to delete stack: '; // err instanceof actions.CloudFormationError
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.next();
        });
    },

    monitorStack: function(context) {
        actions.monitor(context.stackName, context.stackRegion, function(err) {
            if (err) {
                err.failure = err.message;
                err.message = `Monitoring your deploy failed, but the deploy in region ${context.stackRegion} will continue. Check on your stack's status in the CloudFormation console.`;
                return context.abort(err);
            }

            context.next();
        });
    },

    getOldParameters: function(context) {
        lookup.parameters(context.stackName, context.stackRegion, function(err, info) {
            if (err) {
                var msg = '';
                if (err instanceof lookup.StackNotFoundError) msg += 'Missing stack: ';
                if (err instanceof lookup.CloudFormationError) msg += 'Failed to find existing stack: ';
                msg += err.message;
                err.message = msg;
                return context.abort(err);
            }

            context.oldParameters = info;
            context.next();
        });
    },

    promptSaveConfig: async function(context) {
        const name = await Prompt.input('Name for saved configuration:', context.suffix);
        context.saveName = name;
        context.next();
    },

    confirmSaveConfig: async function(context) {
        process.stdout.write(stableStringify(context.oldParameters, { space: 2 }) + '\n\n');
        const ready = await Prompt.confirm('Ready to save this configuration as "' + context.saveName + '"?');
        if (!ready) return context.abort();
        context.next();
    },

    saveConfig: async function(context) {
        const kms = (context.overrides.kms && typeof context.overrides.kms !== 'string') ? 'alias/cloudformation' : context.overrides.kms;
        const maskedParameters = Object.assign({}, context.newParameters || {});
        const templateBody = context.newTemplate || {};
        Object.keys(templateBody.Parameters || {}).forEach(function(name) {
            var parameter = templateBody.Parameters[name];
            if (parameter.NoEcho) {
                maskedParameters[name] = NOECHO_MASK;
            }
        });


        try {
            await actions.saveConfiguration(
                context.baseName,
                context.stackName,
                context.stackRegion,
                context.configBucket,
                maskedParameters,
                kms
            );
        } catch (err) {
            let msg = '';
            if (err instanceof actions.BucketNotFoundError) msg += 'Could not find template bucket: ';
            if (err instanceof actions.S3Error) msg += 'Failed to save template: ';
            msg += err.message;
            err.message = msg;
            return context.abort(err);
        }

        context.next();
    },

    mergeMetadata: function(context) {
        if (!context.overrides.metadata) return context.next();
        context.newTemplate.Metadata = context.newTemplate.Metadata || {};
        for (var k in context.overrides.metadata) {
            if (context.newTemplate.Metadata[k] !== undefined) {
                return context.next(new Error('Metadata.' + k + ' already exists in template'));
            } else {
                context.newTemplate.Metadata[k] = context.overrides.metadata[k];
            }
        }
        context.next();
    }
};

function compare(existing, desired) {
    existing = JSON.parse(JSON.stringify(existing));
    desired = JSON.parse(JSON.stringify(desired));
    try {
        assert.deepEqual(existing, desired);
        return;
    } catch (err) {
        return jsonDiff.diffString(existing, desired);
    }
}

function compareTemplate(existing, desired) {
    // --------------------------------------------------
    // Hacky exemption for Mapbox's Metadata.LastDeployedBy
    existing = JSON.parse(JSON.stringify(existing));
    desired = JSON.parse(JSON.stringify(desired));
    delete (existing.Metadata || {}).LastDeployedBy;
    delete (desired.Metadata || {}).LastDeployedBy;
    // --------------------------------------------------

    existing = stableStringify(existing, { space: 2 });
    desired = stableStringify(desired, { space: 2 });

    try {
        assert.equal(existing, desired);
        return;
    } catch (err) {
        var strDiff = Diff.diffLines(existing, desired, {
            ignoreWhitespace: true
        });
        var diffText = '';

        strDiff.forEach(function(part, i){
            var color = part.added ? 'green' : part.removed ? 'red' : 'grey';
            var delimiter = '\n---------------------------------------------\n\n';

            if (color === 'grey') {
                var lines = part.value.split('\n').slice(0, -1);
                if (lines.length > 10) {
                    var first = lines.slice(0, 3).map((line) => ` ${line}`);
                    var last = lines.slice(-3).map((line) => ` ${line}`);
                    if (i !== 0) diffText += `${first.join('\n')}\n`.grey;
                    if (i !== 0 && i !== strDiff.length - 1) diffText += delimiter.grey;
                    if (i !== strDiff.length - 1) diffText += `${last.join('\n')}\n`.grey;
                    return;
                }
            }

            var toPrint = part.value
                .split('\n')
                .map((line) => `${!line.length ? '' : part.added ? '+' : part.removed ? '-' : ' '}${line}`)
                .join('\n')[color];

            diffText += toPrint;
        });

        return diffText;
    }
}

function formatDiff(details) {
    var t = new Table();

    function colors(msg) {
        if (msg === 'Modify') return msg.yellow;
        if (msg === 'Add') return msg.green;
        if (msg === 'Remove') return msg.red;
        if (msg === 'true') return msg.red;
        if (msg === 'false') return msg.green;
        return msg;
    }

    details.changes.forEach(function(change) {
        t.cell('Action', colors(change.action));
        t.cell('Name', colors(change.name));
        t.cell('Type', colors(change.type));
        t.cell('Replace', colors(change.replacement.toString()));
        t.newRow();
    });

    return t.toString();
}

function stackName(name, suffix) {
    return suffix ? name + '-' + suffix : name;
}

/**
 * Build parameters object for CloudFormation requests
 *
 * @private
 * @param {object} oldParameters - name/value pairs defining old or default parameters
 * @param {object} newParameters - name/value pairs defining the new, unchanged old, or accepted default parameters
 * @param {object} [overrideParameters={}] - name/value pairs for any parameter values passed as overrides
 * @param {boolean} isCreate - indicates that UsePreviousValue shoudld not be used on stack create. set in createPreable().
 * @returns {array} params - parameters objects for use in ChangeSet requests that create/update a stack
 */
function changesetParameters(oldParameters, newParameters, overrideParameters, isCreate) {
    overrideParameters = overrideParameters || {};

    return Object.entries(newParameters).map(([key, value]) => {
        const parameter = {
            ParameterKey: key
        };

        const unchanged = oldParameters[key] === newParameters[key];
        const isOverriden = overrideParameters[key] && unchanged;

        if (isCreate || isOverriden) parameter.ParameterValue = value;
        else if (unchanged) parameter.UsePreviousValue = true;
        else parameter.ParameterValue = value;

        return parameter;
    });
}

module.exports = Commands;
