var assert = require('assert');
var path = require('path');
var jsonDiff = require('json-diff');
var Table = require('easy-table');
var actions = require('./actions');
var lookup = require('./lookup');
var prompt = require('./prompt');
var template = require('./template');
var d3 = require('d3-queue');
require('colors');


/**
 * Override various aspects of the deployment chain
 *
 * @name overrides
 * @property {object} parameters
 * @property {boolean} force
 * @property {object} templateOptions
 * @property {function} beforeUpdate
 * @property {string} defaultConfig
 * @property {string} kms
 */

/**
 * Provides a set of commands for interacting with a CloudFormation stack
 *
 * @param {object} config
 * @param {string} config.name - the base name of the stack (no suffix)
 * @param {string} config.region - the region the stack resides, or will reside in
 * @param {string} config.configBucket - the bucket that contains saved configurations
 * @param {string} config.templateBucket - the bucket where templates can be stored.
 * This bucket must be in the same region as the stack.
 * @returns {object} commands - a set of functions for operating with CloudFormation templates
 */
module.exports = function(config) {
  var commands = {};

  commands.create = function(suffix, templatePath, overrides, callback) {
    if (typeof overrides === 'function') {
      callback = overrides;
      overrides = {};
    }

    var context = module.exports.commandContext(config, suffix, [
      operations.createPreamble,
      operations.selectConfig,
      operations.loadConfig,
      operations.promptParameters,
      operations.confirmCreate,
      operations.saveTemplate,
      operations.validateTemplate,
      operations.createStack,
      operations.monitorStack
    ], callback);

    context.overrides = overrides;
    context.templatePath = path.resolve(templatePath);
    context.next();
  };

  commands.update = function(suffix, templatePath, overrides, callback) {
    if (typeof overrides === 'function') {
      callback = overrides;
      overrides = {};
    }

    var context = module.exports.commandContext(config, suffix, [
      operations.updatePreamble,
      operations.promptParameters,
      operations.confirmParameters,
      operations.confirmTemplate,
      operations.saveTemplate,
      operations.validateTemplate,
      operations.beforeUpdateHook,
      operations.getChangeset,
      operations.confirmChangeset,
      operations.executeChangeSet,
      operations.monitorStack
    ], callback);

    context.overrides = overrides;
    context.templatePath = path.resolve(templatePath);
    context.next();
  };

  commands.delete = function(suffix, overrides, callback) {
    if (typeof overrides === 'function') {
      callback = overrides;
      overrides = {};
    }

    var context = module.exports.commandContext(config, suffix, [
      operations.confirmDelete,
      operations.deleteStack,
      operations.monitorStack
    ], callback);

    context.monitorInterval = 5000;
    context.overrides = overrides;
    context.next();
  };

  commands.info = function(suffix, resources, callback) {
    if (typeof resources === 'function') {
      callback = resources;
      resources = false;
    }

    lookup.info(stackName(config.name, suffix), config.region, resources, callback);
  };

  commands.save = function(suffix, kms, callback) {
    if (typeof kms === 'function') {
      callback = kms;
      kms = false;
    }

    var context = module.exports.commandContext(config, suffix, [
      operations.getOldParameters,
      operations.promptSaveConfig,
      operations.confirmSaveConfig,
      operations.saveConfig
    ], callback);

    context.kms = kms;
    context.next();
  };

  return commands;
};

module.exports.commandContext = function(config, suffix, operations, callback) {
  var i = -1;

  var context = {
    baseName: config.name,
    suffix: suffix,
    stackName: stackName(config.name, suffix),
    stackRegion: config.region,
    configBucket: config.configBucket,
    templateBucket: config.templateBucket,
    overrides: {},
    oldParameters: {},
    abort: callback,
    next: function() {
      i++;
      var operation = operations[i];
      if (!operation) return callback();
      operation(context);
    }
  };

  return context;
};

var operations = module.exports.operations = {
  updatePreamble: function(context) {
    var preamble = d3.queue();
    preamble.defer(template.read, context.templatePath, context.overrides.templateOptions);
    preamble.defer(lookup.parameters, context.stackName, context.stackRegion);
    preamble.defer(lookup.template, context.stackName, context.stackRegion);
    preamble.await(function(err, templateBody, oldParams, oldTemplate) {
      if (err) {
        var msg = '';
        if (err instanceof template.NotFoundError) msg += 'Could not load template: ';
        if (err instanceof template.InvalidTemplateError) msg += 'Could not parse template: ';
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

  promptParameters: function(context) {
    if (context.overrides.parameters) {
      Object.keys(context.overrides.parameters).forEach(function(key){
        context.oldParameters[key] = context.overrides.parameters[key];
      });
    }

    if (context.overrides.force) {
      context.newParameters = {};
      Object.keys(context.newTemplate.Parameters || {}).forEach(function(key){
        if (context.oldParameters[key] !== undefined) {
          context.newParameters[key] = context.oldParameters[key];
        }
      });
      return context.next();
    }

    var questions = template.questions(context.newTemplate, {
      defaults: context.oldParameters,
      region: context.region,
      kmsKeyId: context.overrides.kms
    });
    
    prompt.parameters(questions, function(err, answers) {
      context.newParameters = answers;
      context.next();
    });
  },

  confirmParameters: function(context) {
    if (context.overrides.force) return context.next();

    var diff = compare(context.oldParameters, context.newParameters);
    if (!diff) return context.next();

    prompt.confirm([diff, 'Accept parameter changes?'].join('\n'), function(err, ready) {
      if (!ready) return context.abort();
      context.next();
    });
  },

  confirmTemplate: function(context) {
    if (context.overrides.force) return context.next();

    var diff = compare(context.oldTemplate, context.newTemplate);
    if (!diff) return context.next();

    prompt.confirm([diff, 'Accept template changes?'].join('\n'), function(err, ready) {
      if (!ready) return context.abort();
      context.next();
    });
  },

  saveTemplate: function(context) {
    context.templateUrl = actions.templateUrl(context.templateBucket, context.stackRegion, context.suffix);
    actions.saveTemplate(context.templateUrl, JSON.stringify(context.newTemplate), function(err) {
      if (err) {
        var msg = '';
        if (err instanceof actions.BucketNotFoundError) msg += 'Could not find template bucket: ';
        if (err instanceof actions.S3Error) msg += 'Failed to save template: ';
        msg += err.message;
        err.message = msg;
        return context.abort(err);
      }

      context.next();
    });
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

  beforeUpdateHook: function(context) {
    if (!context.overrides.beforeUpdate) return context.next();

    context.overrides.beforeUpdate(context, function(err) {
      if (err) return context.abort(err);
      context.next();
    });
  },

  getChangeset: function(context) {
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
      context.templateUrl,
      context.newParameters,
      finished
    );
  },

  confirmChangeset: function(context) {
    if (context.overrides.force) return context.next();

    var msg = [
      formatDiff(context.changeset),
      'Accept changes and update the stack?'
    ].join('\n');

    prompt.confirm(msg, function(err, ready) {
      if (!ready) return context.abort();
      context.next();
    });
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
    preamble.defer(template.read, context.templatePath, context.overrides.templateOptions);
    preamble.defer(lookup.configurations, context.baseName, context.configBucket);
    preamble.await(function(err, templateBody, configs) {
      if (err) {
        var msg = '';
        if (err instanceof template.NotFoundError) msg += 'Could not load template: ';
        if (err instanceof template.InvalidTemplateError) msg += 'Could not parse template: ';
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

  selectConfig: function(context) {
    if (context.overrides.force) return context.next();

    prompt.configuration(context.configNames, function(err, savedConfig) {
      if (savedConfig === 'New configuration') return context.next();

      context.configName = savedConfig;
      context.next();
    });
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

  confirmCreate: function(context) {
    if (context.overrides.force) return context.next();

    prompt.confirm('Ready to create the stack?', function(err, ready) {
      if (!ready) return context.abort();
      context.next();
    });
  },

  createStack: function(context) {
    function finished(err) {
      if (err) {
        var msg = 'Failed to create stack: '; // err instanceof actions.CloudFormationError
        msg += err.message;
        err.message = msg;
        return context.abort(err);
      }

      context.next();
    }

    actions.create(
      context.stackName,
      context.stackRegion,
      context.templateUrl,
      context.newParameters,
      finished
    );
  },

  confirmDelete: function(context) {
    if (context.overrides.force) return context.next();

    prompt.confirm('Are you sure you want to delete ' + context.stackName + '?', function(err, ready) {
      if (!ready) return context.abort();
      context.next();
    });
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
    actions.monitor(context.stackName, context.stackRegion, context.monitorInterval, function(err) {
      if (err) {
        err.failure = err.message;
        err.message = 'Failed during stack monitoring. Stack adjustments will continue.';
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

  promptSaveConfig: function(context) {
    prompt.input('Name for saved configuration:', context.suffix, function(err, name) {
      context.saveName = name;
      context.next();
    });
  },

  confirmSaveConfig: function(context) {
    process.stdout.write(JSON.stringify(context.oldParameters, null, 2) + '\n\n');
    prompt.confirm('Ready to save this configuration as "' + context.saveName + '"?', function(err, ready) {
      if (!ready) return context.abort();
      context.next();
    });
  },

  saveConfig: function(context) {
    function finished(err) {
      if (err) {
        var msg = '';
        if (err instanceof actions.BucketNotFoundError) msg += 'Could not find template bucket: ';
        if (err instanceof actions.S3Error) msg += 'Failed to save template: ';
        msg += err.message;
        err.message = msg;
        return context.abort(err);
      }

      context.next();
    }

    actions.saveConfiguration(
      context.baseName,
      context.configBucket,
      context.saveName,
      context.oldParameters,
      context.overrides.kms,
      finished
    );
  }
};

function compare(existing, desired) {
  try {
    assert.deepEqual(existing, desired);
    return;
  } catch (err) {
    return jsonDiff.diffString(existing, desired);
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
