var path = require('path');
var test = require('tape');
var sinon = require('sinon');
var commands = require('../lib/commands');
var prompt = require('../lib/prompt');
var actions = require('../lib/actions');
var lookup = require('../lib/lookup');
var template = require('../lib/template');

var opts = {
  name: 'my-stack',
  region: 'us-east-1',
  configBucket: 'my-config-bucket',
  templateBucket: 'my-template-bucket'
};

var basicContext = commands.commandContext(opts, 'testing', [], function() {});

test('[commands.create] no overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.templatePath, path.resolve('templatePath'), 'set absolute context.templatePath');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).create('testing', 'templatePath', whenDone);
});

test('[commands.create] with overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.templatePath, path.resolve('templatePath'), 'set absolute context.templatePath');
        assert.deepEqual(context.overrides, { some: 'overrides' }, 'sets context.overrides');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).create('testing', 'templatePath', { some: 'overrides' }, whenDone);
});

test('[commands.update] with overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.templatePath, path.resolve('templatePath'), 'set absolute context.templatePath');
        assert.deepEqual(context.overrides, { force: true }, 'sets context.overrides');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).update('testing', 'templatePath', { force: true }, whenDone);
});

test('[commands.update] with multiple overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.templatePath, path.resolve('templatePath'), 'set absolute context.templatePath');
        assert.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill' }, 'sets context.overrides');
        commands.commandContext.restore();
        assert.end();
      }
    });
    return context;
  });

  commands(opts).update('testing', 'templatePath', { force: true, masterConfig: 's3://chill' }, whenDone);

});

test('[commands.update] no overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.templatePath, path.resolve('templatePath'), 'set absolute context.templatePath');
        assert.deepEqual(context.overrides, {}, 'sets empty context.overrides');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).update('testing', 'templatePath', whenDone);
});

test('[commands.delete] no overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.monitorInterval, 5000, 'sets monitorInterval');
        assert.deepEqual(context.overrides, {}, 'sets empty overrides');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).delete('testing', whenDone);
});

test('[commands.delete] with overrides', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.monitorInterval, 5000, 'sets monitorInterval');
        assert.deepEqual(context.overrides, { force: true }, 'sets empty overrides');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).delete('testing', { force: true }, whenDone);
});

test('[commands.info] success w/o resources', function(assert) {
  sinon.stub(lookup, 'info', function(name, region, resources, decrypt, callback) {
    assert.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
    assert.equal(region, 'us-east-1', 'lookup.info expected region');
    assert.notOk(resources, 'lookup.info no resources');
    assert.notOk(decrypt, 'lookup.info decrypt=false');
    callback();
  });

  commands(opts).info('testing', function(err) {
    assert.ifError(err, 'success');
    lookup.info.restore();
    assert.end();
  });
});

test('[commands.info] success w/ resources', function(assert) {
  sinon.stub(lookup, 'info', function(name, region, resources, decrypt, callback) {
    assert.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
    assert.equal(region, 'us-east-1', 'lookup.info expected region');
    assert.ok(resources, 'lookup.info no resources');
    assert.notOk(decrypt, 'lookup.info decrypt=false');
    callback();
  });

  commands(opts).info('testing', true, function(err) {
    assert.ifError(err, 'success');
    lookup.info.restore();
    assert.end();
  });
});

test('[commands.info] success w/o decrypt', function(assert) {
  sinon.stub(lookup, 'info', function(name, region, resources, decrypt, callback) {
    assert.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
    assert.equal(region, 'us-east-1', 'lookup.info expected region');
    assert.ok(resources, 'lookup.info resources');
    assert.notOk(decrypt, 'lookup.info decrypt=false');
    callback();
  });

  commands(opts).info('testing', true, function(err) {
    assert.ifError(err, 'success');
    lookup.info.restore();
    assert.end();
  });
});

test('[commands.info] success w/ decrypt', function(assert) {
  sinon.stub(lookup, 'info', function(name, region, resources, decrypt, callback) {
    assert.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
    assert.equal(region, 'us-east-1', 'lookup.info expected region');
    assert.ok(resources, 'lookup.info resources');
    assert.ok(decrypt, 'lookup.info decrypt=true');
    callback();
  });

  commands(opts).info('testing', true, true, function(err) {
    assert.ifError(err, 'success');
    lookup.info.restore();
    assert.end();
  });
});

test('[commands.info] null provided as suffix', function(assert) {
  sinon.stub(lookup, 'info', function(name, region, resources, decrypt, callback) {
    assert.equal(name, 'my-stack', 'no trailing - on stack name');
    callback();
  });

  commands(opts).info(null, true, function(err) {
    assert.ifError(err, 'success');
    lookup.info.restore();
    assert.end();
  });
});

test('[commands.save] kms-mode', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.kms, true, 'sets context.kms');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).save('testing', true, whenDone);
});

test('[commands.save] not kms-mode', function(assert) {
  function whenDone() {}

  sinon.stub(commands, 'commandContext', function(config, suffix, operations, callback) {
    assert.deepEqual(config, opts, 'instantiate context with expected config');
    assert.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
    assert.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
    assert.equal(callback, whenDone, 'instantiate context with final callback function');

    var context = Object.assign({}, basicContext, {
      next: function() {
        assert.pass('called next to begin process');
        assert.equal(context.kms, false, 'sets context.kms');
        commands.commandContext.restore();
        assert.end();
      }
    });

    return context;
  });

  commands(opts).save('testing', whenDone);
});

test('[commands.commandContext] sets context', function(assert) {
  var context = commands.commandContext(opts, 'testing', opts, function() {});
  assert.equal(context.baseName, opts.name, 'sets baseName');
  assert.equal(context.suffix, 'testing', 'sets suffix');
  assert.equal(context.stackName, opts.name + '-testing', 'sets stackName');
  assert.equal(context.stackRegion, opts.region, 'sets stackRegion');
  assert.equal(context.configBucket, opts.configBucket, 'sets configBucket');
  assert.equal(context.templateBucket, opts.templateBucket, 'sets templateBucket');
  assert.deepEqual(context.overrides, {}, 'sets empty overrides');
  assert.deepEqual(context.oldParameters, {}, 'sets empty oldParameters');
  assert.equal(typeof context.abort, 'function', 'sets abort function');
  assert.equal(typeof context.next, 'function', 'sets next function');
  assert.end();
});

test('[commands.commandContext] handles null suffix', function(assert) {
  var context = commands.commandContext(opts, null, opts, function() {});
  assert.equal(context.stackName, opts.name, 'sets stackName without trailing -');
  assert.end();
});

test('[commands.commandContext] iterates through operations', function(assert) {
  var i = 0;
  var ops = [
    function(context) {
      assert.equal(i, 0, 'called first function');
      i++;
      context.next();
    },
    function(context) {
      assert.equal(i, 1, 'called second function');
      i++;
      context.next();
    }
  ];

  var context = commands.commandContext(opts, 'testing', ops, function(err, performed) {
    assert.ifError(err, 'success');
    assert.equal(performed, true, 'the requested command was performed');
    assert.end();
  });

  context.next();
});

test('[commands.commandContext] aborts', function(assert) {
  var ops = [
    function(context) { context.abort(); }
  ];

  var context = commands.commandContext(opts, 'testing', ops, function(err, performed) {
    assert.ifError(err, 'success');
    assert.equal(performed, false, 'the requested command was not performed');
    assert.end();
  });

  context.next();
});

test('[commands.commandContext] aborts with error', function(assert) {
  var ops = [
    function(context) { context.abort(new Error('failure')); }
  ];

  var context = commands.commandContext(opts, 'testing', ops, function(err, performed) {
    assert.equal(err.message, 'failure', 'success');
    assert.equal(performed, false, 'the requested command was not performed');
    assert.end();
  });

  context.next();
});

test('[commands.operations.updatePreamble] template not found', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback(new template.NotFoundError('failure'));
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback();
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback();
  });

  var context = Object.assign({}, basicContext, {
    next: function() {
      assert.fail('should not call next');
    },
    abort: function(err) {
      assert.ok(err instanceof template.NotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not load template: failure', 'expected error message');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] template invalid', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback(new template.InvalidTemplateError('failure'));
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback();
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback();
  });

  var context = Object.assign({}, basicContext, {
    next: function() {
      assert.fail('should not call next');
    },
    abort: function(err) {
      assert.ok(err instanceof template.InvalidTemplateError, 'expected error type');
      assert.equal(err.message, 'Could not parse template: failure', 'expected error message');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] stack not found for parameters', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback();
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback(new lookup.StackNotFoundError('failure'));
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback();
  });

  var context = Object.assign({}, basicContext, {
    next: function() {
      assert.fail('should not call next');
    },
    abort: function(err) {
      assert.ok(err instanceof lookup.StackNotFoundError, 'expected error type');
      assert.equal(err.message, 'Missing stack: failure', 'expected error message');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] failure getting stack parameters', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback();
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback(new lookup.CloudFormationError('failure'));
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback();
  });

  var context = Object.assign({}, basicContext, {
    next: function() {
      assert.fail('should not call next');
    },
    abort: function(err) {
      assert.ok(err instanceof lookup.CloudFormationError, 'expected error type');
      assert.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] stack not found for template', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback();
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback();
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback(new lookup.StackNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    next: function() {
      assert.fail('should not call next');
    },
    abort: function(err) {
      assert.ok(err instanceof lookup.StackNotFoundError, 'expected error type');
      assert.equal(err.message, 'Missing stack: failure', 'expected error message');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] failure getting stack template', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback();
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback();
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback(new lookup.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    next: function() {
      assert.fail('should not call next');
    },
    abort: function(err) {
      assert.ok(err instanceof lookup.CloudFormationError, 'expected error type');
      assert.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] success', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    assert.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
    callback(null, { new: 'template' });
  });

  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback(null, { old: 'parameters' });
  });

  sinon.stub(lookup, 'template', function(name, region, callback) {
    callback(null, { old: 'template' });
  });

  var context = Object.assign({}, basicContext, {
    overrides: { templateOptions: { template: 'options' } },
    next: function() {
      assert.pass('calls next()');
      assert.deepEqual(context.newTemplate, { new: 'template' }, 'sets context.newTemplate');
      assert.deepEqual(context.oldTemplate, { old: 'template' }, 'sets context.oldTemplate');
      assert.deepEqual(context.oldParameters, { old: 'parameters' }, 'sets context.oldParameters');
      template.read.restore();
      lookup.parameters.restore();
      lookup.template.restore();
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'failed');
    }
  });

  commands.operations.updatePreamble(context);
});

test('[commands.operations.getMasterConfig] success', function(assert) {

  sinon.stub(lookup, 'defaultConfiguration', function(s3Url, callback) {
    callback(null, { old: 'fresh' });
  });

  var context = Object.assign({}, basicContext, {
    overrides: { masterConfig: 's3://chill.cfn.json' },
    next: function() {
      assert.pass('calls next()');
      assert.deepEqual(context.oldParameters, { old: 'fresh' }, 'sets context.oldParameters');
      lookup.defaultConfiguration.restore();
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'failed');
    }
  });

  context.oldParameters = { old: 'stale' };
  commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] no-op', function(assert) {

  sinon.stub(lookup, 'defaultConfiguration', function(s3Url, callback) {
    callback(null, { old: 'fresh' });
  });

  var context = Object.assign({}, basicContext, {
    overrides: {},
    next: function() {
      assert.pass('calls next()');
      assert.deepEqual(context.oldParameters, { old: 'stale' }, 'context.oldParameters stays the same');
      lookup.defaultConfiguration.restore();
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'failed');
    }
  });

  context.oldParameters = { old: 'stale' };
  commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] failed', function(assert) {

  sinon.stub(lookup, 'defaultConfiguration', function(s3Url, callback) {
    callback(new Error(), {});
  });

  var context = Object.assign({}, basicContext, {
    overrides: { masterConfig: 's3://unchill.cfn.json' },
    next: function() {
      assert.fail('should not call next');
    },
    abort: function() {
      lookup.defaultConfiguration.restore();
      assert.end();
    }
  });

  context.oldParameters = { old: 'stale' };
  commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] no matching oldParameters does not put masterConfig keys into oldParameters for better looking diff at the end', function(assert) {

  sinon.stub(lookup, 'defaultConfiguration', function(s3Url, callback) {
    callback(null, { bingo: 'fresh' });
  });

  var context = Object.assign({}, basicContext, {
    overrides: { masterConfig: 's3://chill.cfn.json' },
    next: function() {
      assert.pass('calls next()');
      assert.deepEqual(context.oldParameters, { old: 'stale' }, 'leaves context.oldParameters alone');
      lookup.defaultConfiguration.restore();
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'failed');
    }
  });

  context.oldParameters = { old: 'stale' };
  commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] adding a newParameter that matches masterConfig parameter does not get overwritten, so that user is intentional in adding newParameters', function(assert) {

  sinon.stub(lookup, 'defaultConfiguration', function(s3Url, callback) {
    callback(null, { old: 'fresh' });
  });

  var context = Object.assign({}, basicContext, {
    overrides: { masterConfig: 's3://chill.cfn.json' },
    next: function() {
      assert.pass('calls next()');
      assert.deepEqual(context.oldParameters, { hello: 'goodbye' }, 'no matching keys between oldParameters and masterConfig, no oldParameters are replaced');
      assert.deepEqual(context.newParameters, { old: 'special whale' }, 'newParameters are not replaced despite matching keys');
      lookup.defaultConfiguration.restore();
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'failed');
    }
  });

  context.oldParameters = { hello: 'goodbye' };
  context.newParameters = { old: 'special whale' };
  commands.operations.getMasterConfig(context);
});

test('[commands.operations.promptParameters] force-mode', function(assert) {
  sinon.stub(template, 'questions', function() {
    assert.fail('should not build questions');
  });

  var context = Object.assign({}, basicContext, {
    newTemplate: { Parameters: { old: {}, new: {} } },
    oldParameters: { old: 'parameters', extra: 'value' },
    overrides: { force: true },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.newParameters, { old: 'parameters' }, 'sets new parameters to old values, excluding values not present in template');
      assert.notOk(context.newParameters.new, 'does not provide a parameter value if no default for it was found');
      template.questions.restore();
      assert.end();
    }
  });

  commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] not force-mode', function(assert) {
  var questions = { parameter: 'questions' };
  var answers = { parameter: 'answers' };

  sinon.stub(template, 'questions', function(template, overrides) {
    assert.deepEqual(template, { new: 'template' }, 'builds questions for new template');
    assert.deepEqual(overrides, { defaults: { old: 'parameters' }, kmsKeyId: undefined, region: 'us-east-1' }, 'uses old parameters as default values');
    return questions;
  });

  sinon.stub(prompt, 'parameters', function(question, callback) {
    assert.deepEqual(question, questions, 'prompts for derived questions');
    callback(null, answers);
  });

  var context = Object.assign({}, basicContext, {
    newTemplate: { new: 'template' },
    oldParameters: { old: 'parameters' },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.newParameters, answers, 'sets new parameters to prompt responses');
      template.questions.restore();
      prompt.parameters.restore();
      assert.end();
    }
  });

  commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] with parameter and kms overrides', function(assert) {
  sinon.stub(template, 'questions', function(template, overrides) {
    assert.deepEqual(overrides, { defaults: { old: 'overriden' }, kmsKeyId: 'this is a bomb key', region: 'us-west-2' }, 'uses override parameters');
    return { parameter: 'questions' };
  });

  sinon.stub(prompt, 'parameters', function(questions, callback) {
    callback({ the: 'answers' });
  });

  var context = Object.assign({}, basicContext, {
    stackRegion: 'us-west-2',
    newTemplate: { new: 'template' },
    oldParameters: { old: 'parameters' },
    overrides: { parameters: { old: 'overriden' }, kms: 'this is a bomb key' },
    next: function(err) {
      assert.ifError(err, 'success');
      template.questions.restore();
      prompt.parameters.restore();
      assert.end();
    }
  });

  commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] force-mode with no parameters in new template', function(assert) {
  var context = Object.assign({}, basicContext, {
    newTemplate: { new: 'template' },
    overrides: { force: true },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.newParameters, {}, 'sets context.newParameters to empty');
      assert.end();
    }
  });

  commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] reject overrides that are not in old or new template', function(assert) {
  sinon.stub(prompt, 'parameters', function(questions, callback) {
    callback(null, { some: 'answers' });
  });

  var context = Object.assign({}, basicContext, {
    newTemplate: { Parameters: { Name: {} } },
    oldParameters: { Name: 'name', Age: 'age' },
    overrides: { parameters: { Name: 'overriden', Born: 'ignored' } },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.notOk(context.oldParameters.Born, 'excludes extraneous parameter override');
      prompt.parameters.restore();
      assert.end();
    }
  });

  commands.operations.promptParameters(context);
});

test('[commands.operations.confirmParameters] force-mode', function(assert) {
  var context = Object.assign({}, basicContext, {
    overrides: { force: true },
    oldParameters: { old: 'parameters' },
    newParameters: { old: 'parameters' },
    next: function() {
      assert.pass('skipped prompting');
      assert.end();
    }
  });

  commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmParameters] no difference', function(assert) {
  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    newParameters: { old: 'parameters' },
    next: function() {
      assert.pass('skipped prompting');
      assert.end();
    }
  });

  commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmParameters] rejected', function(assert) {
  assert.plan(2);

  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameters"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
    callback(null, false);
  });

  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    newParameters: { new: 'parameters' },
    next: function() {
      assert.fail('should not proceed');
    },
    abort: function(err) {
      assert.ifError(err, 'aborted');
      prompt.confirm.restore();
    }
  });

  commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmParameters] accepted', function(assert) {
  assert.plan(2);

  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameters"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    newParameters: { new: 'parameters' },
    next: function(err) {
      assert.ifError(err, 'success');
      prompt.confirm.restore();
    },
    abort: function() {
      assert.fail('should proceed');
    }
  });

  commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmTemplate] no difference', function(assert) {
  var context = Object.assign({}, basicContext, {
    oldTemplate: { old: 'template' },
    newTemplate: { old: 'template' },
    next: function() {
      assert.pass('skipped prompting');
      assert.end();
    }
  });

  commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] undefined', function(assert) {
  var context = Object.assign({}, basicContext, {
    oldTemplate: { Parameters: { old: undefined } },
    newTemplate: { Parameters: {} },
    next: function() {
      assert.pass('skipped prompting');
      assert.end();
    }
  });

  commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] force-mode', function(assert) {
  var context = Object.assign({}, basicContext, {
    oldTemplate: { old: 'template' },
    newTemplate: { new: 'template' },
    overrides: { force: true },
    next: function(err) {
      assert.ifError(err, 'should proceed');
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'should not proceed');
    }
  });

  commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] rejected', function(assert) {
  assert.plan(2);

  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, ' {\n\x1b[31m-  old: "template"\x1b[39m\n\x1b[32m+  new: "template"\x1b[39m\n }\n\nAccept template changes?', 'prompted appropriate message');
    callback(null, false);
  });

  var context = Object.assign({}, basicContext, {
    oldTemplate: { old: 'template' },
    newTemplate: { new: 'template' },
    next: function() {
      assert.fail('should not proceed');
    },
    abort: function(err) {
      assert.ifError(err, 'aborted');
      prompt.confirm.restore();
    }
  });

  commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] accepted', function(assert) {
  assert.plan(2);

  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, ' {\n\x1b[31m-  old: "template"\x1b[39m\n\x1b[32m+  new: "template"\x1b[39m\n }\n\nAccept template changes?', 'prompted appropriate message');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    oldTemplate: { old: 'template' },
    newTemplate: { new: 'template' },
    next: function(err) {
      assert.ifError(err, 'success');
      prompt.confirm.restore();

    },
    abort: function() {
      assert.fail('should not abort');
    }
  });

  commands.operations.confirmTemplate(context);
});

test('[commands.operations.saveTemplate] bucket not found', function(assert) {
  var url = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

  sinon.stub(actions, 'templateUrl', function() {
    return url;
  });

  sinon.stub(actions, 'saveTemplate', function(url, template, callback) {
    callback(new actions.BucketNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof actions.BucketNotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not find template bucket: failure', 'expected error message');
      actions.templateUrl.restore();
      actions.saveTemplate.restore();
      assert.end();
    }
  });

  commands.operations.saveTemplate(context);
});

test('[commands.operations.saveTemplate] failed to save template', function(assert) {
  var url = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

  sinon.stub(actions, 'templateUrl', function() {
    return url;
  });

  sinon.stub(actions, 'saveTemplate', function(url, template, callback) {
    callback(new actions.S3Error('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof actions.S3Error, 'expected error type');
      assert.equal(err.message, 'Failed to save template: failure', 'expected error message');
      actions.templateUrl.restore();
      actions.saveTemplate.restore();
      assert.end();
    }
  });

  commands.operations.saveTemplate(context);
});

test('[commands.operations.saveTemplate] success', function(assert) {
  var templateUrl = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

  sinon.stub(actions, 'templateUrl', function(bucket, region, suffix) {
    assert.equal(bucket, context.templateBucket, 'template url in proper bucket');
    assert.equal(region, context.stackRegion, 'template url in proper region');
    assert.equal(suffix, context.suffix, 'template url for correct suffix');
    return templateUrl;
  });

  sinon.stub(actions, 'saveTemplate', function(url, template, callback) {
    assert.equal(url, templateUrl, 'saved to correct url');
    assert.equal(template, JSON.stringify(context.newTemplate), 'saved correct template');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    newTemplate: { new: 'template' },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.equal(context.templateUrl, templateUrl, 'sets template url');
      actions.templateUrl.restore();
      actions.saveTemplate.restore();
      assert.end();
    }
  });

  commands.operations.saveTemplate(context);
});

test('[commands.operations.validateTemplate] invalid', function(assert) {
  sinon.stub(actions, 'validate', function(region, url, callback) {
    callback(new actions.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
    abort: function(err) {
      assert.ok(err instanceof actions.CloudFormationError, 'correct error type');
      assert.equal(err.message, 'Invalid template: failure', 'expected error message');
      actions.validate.restore();
      assert.end();
    }
  });

  commands.operations.validateTemplate(context);
});

test('[commands.operations.validateTemplate] valid', function(assert) {
  assert.plan(3);

  sinon.stub(actions, 'validate', function(region, url, callback) {
    assert.equal(region, context.stackRegion, 'validate in proper region');
    assert.equal(url, context.templateUrl, 'validate proper template');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
    abort: function() {
      assert.fail('failed');
    },
    next: function(err) {
      assert.ifError(err, 'success');
      actions.validate.restore();
    }
  });

  commands.operations.validateTemplate(context);
});

test('[commands.operations.beforeUpdateHook] no hook', function(assert) {
  var context = Object.assign({}, basicContext, {
    abort: function() {
      assert.fail('failed');
    },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.end();
    }
  });

  commands.operations.beforeUpdateHook(context);
});

test('[commands.operations.beforeUpdateHook] hook error', function(assert) {
  var context = Object.assign({}, basicContext, {
    overrides: {
      beforeUpdate: function(context, callback) {
        callback(new Error('failure'));
      }
    },
    abort: function(err) {
      assert.equal(err.message, 'failure', 'passed through error on abort');
      assert.end();
    },
    next: function() {
      assert.fail('should not proceed');
    }
  });

  commands.operations.beforeUpdateHook(context);
});

test('[commands.operations.beforeUpdateHook] hook success', function(assert) {
  assert.plan(2);

  var context = Object.assign({}, basicContext, {
    overrides: {
      beforeUpdate: function(arg, callback) {
        assert.deepEqual(arg, context, 'provided hook with runtime context');
        callback();
      }
    },
    abort: function(err) {
      assert.ifError(err, 'failed');
    },
    next: function() {
      assert.pass('should proceed');
    }
  });

  commands.operations.beforeUpdateHook(context);
});

test('[commands.operations.getChangeset] failure', function(assert) {
  sinon.stub(actions, 'diff', function(name, region, url, params, callback) {
    callback(new actions.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof actions.CloudFormationError, 'correct error type');
      assert.equal(err.message, 'Failed to generate changeset: failure', 'expected error message');
      actions.diff.restore();
      assert.end();
    },
    next: function() {
      assert.fail('should not proceed');
    }
  });

  commands.operations.getChangeset(context);
});

test('[commands.operations.getChangeset] success', function(assert) {
  assert.plan(6);

  var details = { changeset: 'details' };

  sinon.stub(actions, 'diff', function(name, region, url, params, callback) {
    assert.equal(name, context.stackName, 'changeset for correct stack');
    assert.equal(region, context.stackRegion, 'changeset in the correct region');
    assert.equal(url, context.templateUrl, 'changeset for the correct template');
    assert.deepEqual(params, context.newParameters, 'changeset using new parameters');
    callback(null, details);
  });

  var context = Object.assign({}, basicContext, {
    stackName: 'my-stack-testing',
    stackRegion: 'us-east-1',
    newParameters: { new: 'parameters' },
    templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
    abort: function() {
      assert.fail('should not abort');
    },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.changeset, details, 'sets context.changeset');
      actions.diff.restore();
      assert.end();
    }
  });

  commands.operations.getChangeset(context);
});

test('[commands.operations.confirmChangeset] force-mode', function(assert) {
  var context = Object.assign({}, basicContext, {
    overrides: { force: true },
    next: function() {
      assert.pass('accepted with no prompt');
      assert.end();
    },
    abort: function(err) {
      assert.ifError(err, 'should not abort');
    }
  });

  commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] rejected', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    callback(null, false);
  });

  var context = Object.assign({}, basicContext, {
    changeset: { changes: [] },
    abort: function(err) {
      assert.ifError(err, 'aborted');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] acccepted', function(assert) {
  assert.plan(2);

  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, '\n\n\nAccept changes and update the stack?', 'expected message');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    changeset: { changes: [] },
    abort: function() {
      assert.fail('should not abort');
    },
    next: function() {
      assert.pass('success');
      prompt.confirm.restore();
    }
  });

  commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] changeset formatting', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, 'Action  Name  Type  Replace\n------  ----  ----  -------\n\x1b[33mModify\x1b[39m  name  type  \x1b[31mtrue\x1b[39m   \n\x1b[32mAdd\x1b[39m     name  type  \x1b[32mfalse\x1b[39m  \n\x1b[31mRemove\x1b[39m  name  type  \x1b[32mfalse\x1b[39m  \n\nAccept changes and update the stack?', 'expected message (with colors)');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    changeset: {
      changes: [
        { id: 'id', name: 'name', type: 'type', action: 'Modify', replacement: true },
        { id: 'id', name: 'name', type: 'type', action: 'Add', replacement: false },
        { id: 'id', name: 'name', type: 'type', action: 'Remove', replacement: false }
      ]
    },
    abort: function() {
      assert.fail('should not abort');
    },
    next: function() {
      assert.pass('success');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmChangeset(context);
});

test('[commands.operations.executeChangeSet] failure', function(assert) {
  sinon.stub(actions, 'executeChangeSet', function(name, region, id, callback) {
    callback(new actions.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    changeset: { id: 'changeset:arn' },
    abort: function(err) {
      assert.ok(err instanceof actions.CloudFormationError, 'expected error type');
      assert.equal(err.message, 'Failed to execute changeset: failure');
      actions.executeChangeSet.restore();
      assert.end();
    }
  });

  commands.operations.executeChangeSet(context);
});

test('[commands.operations.executeChangeSet] not executable', function(assert) {
  sinon.stub(actions, 'executeChangeSet', function(name, region, id, callback) {
    var err = new actions.ChangeSetNotExecutableError('failure');
    err.execution = 'OBSOLETE';
    err.reason = 'outdated';
    callback(err);
  });

  var context = Object.assign({}, basicContext, {
    changeset: { id: 'changeset:arn' },
    abort: function(err) {
      assert.ok(err instanceof actions.ChangeSetNotExecutableError, 'expected error type');
      assert.equal(err.message, 'Status: OBSOLETE | Reason: outdated | failure', 'expected error message');
      actions.executeChangeSet.restore();
      assert.end();
    }
  });

  commands.operations.executeChangeSet(context);
});

test('[commands.operations.executeChangeSet] success', function(assert) {
  assert.plan(4);

  sinon.stub(actions, 'executeChangeSet', function(name, region, id, callback) {
    assert.equal(name, context.stackName, 'execute on proper stack');
    assert.equal(region, context.stackRegion, 'execute in proper region');
    assert.equal(id, context.changeset.id, 'execute proper changeset');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    changeset: { id: 'changeset:arn' },
    next: function() {
      assert.pass('success');
      actions.executeChangeSet.restore();
      assert.end();
    }
  });

  commands.operations.executeChangeSet(context);
});

test('[commands.operations.createPreamble] template not found', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback(new template.NotFoundError('failure'));
  });

  sinon.stub(lookup, 'configurations', function(name, bucket, callback) {
    callback();
  });

  var context = Object.assign({}, basicContext, {
    templatePath: '/absolute/template/path',
    abort: function(err) {
      assert.ok(err instanceof template.NotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not load template: failure');
      template.read.restore();
      lookup.configurations.restore();
      assert.end();
    }
  });

  commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] template invalid', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback(new template.InvalidTemplateError('failure'));
  });

  sinon.stub(lookup, 'configurations', function(name, bucket, callback) {
    callback();
  });

  var context = Object.assign({}, basicContext, {
    templatePath: '/absolute/template/path',
    abort: function(err) {
      assert.ok(err instanceof template.InvalidTemplateError, 'expected error type');
      assert.equal(err.message, 'Could not parse template: failure');
      template.read.restore();
      lookup.configurations.restore();
      assert.end();
    }
  });

  commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] config bucket not found', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback();
  });

  sinon.stub(lookup, 'configurations', function(name, bucket, callback) {
    callback(new lookup.BucketNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    templatePath: '/absolute/template/path',
    abort: function(err) {
      assert.ok(err instanceof lookup.BucketNotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not find config bucket: failure');
      template.read.restore();
      lookup.configurations.restore();
      assert.end();
    }
  });

  commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] failed to read configurations', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    callback();
  });

  sinon.stub(lookup, 'configurations', function(name, bucket, callback) {
    callback(new lookup.S3Error('failure'));
  });

  var context = Object.assign({}, basicContext, {
    templatePath: '/absolute/template/path',
    abort: function(err) {
      assert.ok(err instanceof lookup.S3Error, 'expected error type');
      assert.equal(err.message, 'Could not load saved configurations: failure');
      template.read.restore();
      lookup.configurations.restore();
      assert.end();
    }
  });

  commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] success', function(assert) {
  sinon.stub(template, 'read', function(templatePath, options, callback) {
    assert.equal(templatePath, context.templatePath, 'read correct template');
    assert.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
    callback(null, { new: 'template' });
  });

  sinon.stub(lookup, 'configurations', function(name, bucket, callback) {
    assert.equal(name, context.baseName, 'lookup correct stack configurations');
    assert.equal(bucket, context.configBucket, 'lookup in correct bucket');
    callback(null, ['config']);
  });

  var context = Object.assign({}, basicContext, {
    templatePath: '/absolute/template/path',
    overrides: { templateOptions: { template: 'options' } },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.newTemplate, { new: 'template' }, 'set context.newTemplate');
      assert.deepEqual(context.configNames, ['config'], 'set context.configNames');
      template.read.restore();
      lookup.configurations.restore();
      assert.end();
    }
  });

  commands.operations.createPreamble(context);
});

test('[commands.operations.selectConfig] force-mode', function(assert) {
  sinon.stub(prompt, 'configuration', function(configs, callback) {
    assert.fail('should not prompt');
    callback(new Error('failure'));
  });

  var context = Object.assign({}, basicContext, {
    overrides: { force: true },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.notOk(context.configName, 'does not set context.configName');
      prompt.configuration.restore();
      assert.end();
    }
  });

  commands.operations.selectConfig(context);
});

test('[commands.operations.selectConfig] new config', function(assert) {
  sinon.stub(prompt, 'configuration', function(configs, callback) {
    assert.deepEqual(configs, context.configNames, 'prompted with correct config names');
    callback(null, 'New configuration');
  });

  var context = Object.assign({}, basicContext, {
    configNames: ['config'],
    next: function(err) {
      assert.ifError(err, 'success');
      assert.notOk(context.configName, 'does not set context.configName');
      prompt.configuration.restore();
      assert.end();
    }
  });

  commands.operations.selectConfig(context);
});

test('[commands.operations.selectConfig] saved config', function(assert) {
  sinon.stub(prompt, 'configuration', function(configs, callback) {
    assert.deepEqual(configs, context.configNames, 'prompted with correct config names');
    callback(null, 'config');
  });

  var context = Object.assign({}, basicContext, {
    configNames: ['config'],
    next: function(err) {
      assert.ifError(err, 'success');
      assert.equal(context.configName, 'config', 'does set context.configName');
      prompt.configuration.restore();
      assert.end();
    }
  });

  commands.operations.selectConfig(context);
});

test('[commands.operations.loadConfig] no saved config, no default', function(assert) {
  var context = Object.assign({}, basicContext, {
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.oldParameters, {}, 'does not set context.oldParameters');
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] no saved config, has default', function(assert) {
  sinon.stub(lookup, 'defaultConfiguration', function(s3url, callback) {
    assert.equal(s3url, 's3://my-bucket/my-default.cfn.json', 'requested correct configuration');
    callback(null, { default: 'configuration' });
  });

  var context = Object.assign({}, basicContext, {
    overrides: { defaultConfig: 's3://my-bucket/my-default.cfn.json' },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.oldParameters, { default: 'configuration' }, 'sets context.oldParameters');
      lookup.defaultConfiguration.restore();
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] bucket not found', function(assert) {
  sinon.stub(lookup, 'configuration', function(name, bucket, config, callback) {
    callback(new lookup.BucketNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    abort: function(err) {
      assert.ok(err instanceof lookup.BucketNotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not find config bucket: failure', 'expected error message');
      lookup.configuration.restore();
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] config not found', function(assert) {
  sinon.stub(lookup, 'configuration', function(name, bucket, config, callback) {
    callback(new lookup.ConfigurationNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    abort: function(err) {
      assert.ok(err instanceof lookup.ConfigurationNotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not find saved configuration: failure', 'expected error message');
      lookup.configuration.restore();
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] invalid config', function(assert) {
  sinon.stub(lookup, 'configuration', function(name, bucket, config, callback) {
    callback(new lookup.InvalidConfigurationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    abort: function(err) {
      assert.ok(err instanceof lookup.InvalidConfigurationError, 'expected error type');
      assert.equal(err.message, 'Saved configuration error: failure', 'expected error message');
      lookup.configuration.restore();
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] failed to load config', function(assert) {
  sinon.stub(lookup, 'configuration', function(name, bucket, config, callback) {
    callback(new lookup.S3Error('failure'));
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    abort: function(err) {
      assert.ok(err instanceof lookup.S3Error, 'expected error type');
      assert.equal(err.message, 'Failed to read saved configuration: failure', 'expected error message');
      lookup.configuration.restore();
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] success', function(assert) {
  sinon.stub(lookup, 'configuration', function(name, bucket, config, callback) {
    assert.equal(name, context.baseName, 'expected stack name');
    assert.equal(bucket, context.configBucket, 'expected config bucket');
    assert.equal(config, context.configName, 'expected config name');
    callback(null, { saved: 'configuration' });
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.oldParameters, { saved: 'configuration' }, 'set context.oldParameters');
      lookup.configuration.restore();
      assert.end();
    }
  });

  commands.operations.loadConfig(context);
});

test('[commands.operations.confirmCreate] force-mode', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.fail('should not prompt');
    callback(new Error('failure'));
  });

  var context = Object.assign({}, basicContext, {
    overrides: { force: true },
    next: function(err) {
      assert.ifError(err, 'success');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmCreate] reject', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    callback(null, false);
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    abort: function(err) {
      assert.ifError(err, 'aborted');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmCreate] accept', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, 'Ready to create the stack?', 'expected message');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    configName: 'config',
    next: function(err) {
      assert.ifError(err, 'success');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmCreate(context);
});

test('[commands.operations.createStack] failure', function(assert) {
  sinon.stub(actions, 'create', function(name, region, url, parameters, callback) {
    callback(new actions.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof actions.CloudFormationError, 'expected error type');
      assert.equal(err.message, 'Failed to create stack: failure');
      actions.create.restore();
      assert.end();
    }
  });

  commands.operations.createStack(context);
});

test('[commands.operations.createStack] success', function(assert) {
  sinon.stub(actions, 'create', function(name, region, url, parameters, callback) {
    assert.equal(name, context.stackName, 'expected stack name');
    assert.equal(region, context.stackRegion, 'expected stack region');
    assert.equal(url, context.templateUrl, 'expected template url');
    assert.deepEqual(parameters, context.newParameters, 'expected parameters');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack/testing.template.json',
    newParameters: { new: 'parameters' },
    next: function(err) {
      assert.ifError(err, 'success');
      actions.create.restore();
      assert.end();
    }
  });

  commands.operations.createStack(context);
});

test('[commands.operations.confirmDelete] force-mode', function(assert) {
  var context = Object.assign({}, basicContext, {
    overrides: { force: true },
    next: function(err) {
      assert.ifError(err, 'no prompt');
      assert.end();
    }
  });

  commands.operations.confirmDelete(context);
});

test('[commands.operations.confirmDelete] reject', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    callback(null, false);
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ifError(err, 'aborted');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmDelete(context);
});

test('[commands.operations.confirmDelete] accept', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, 'Are you sure you want to delete ' + context.stackName + '?', 'expected message');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    next: function(err) {
      assert.ifError(err, 'success');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmDelete(context);
});

test('[commands.operations.deleteStack] failure', function(assert) {
  sinon.stub(actions, 'delete', function(name, region, callback) {
    callback(new actions.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof actions.CloudFormationError, 'expected error type');
      assert.equal(err.message, 'Failed to delete stack: failure', 'expected error message');
      actions.delete.restore();
      assert.end();
    }
  });

  commands.operations.deleteStack(context);
});

test('[commands.operations.deleteStack] success', function(assert) {
  sinon.stub(actions, 'delete', function(name, region, callback) {
    assert.equal(name, context.stackName, 'deleted expected stack');
    assert.equal(region, context.stackRegion, 'deleted in expected region');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    next: function(err) {
      assert.ifError(err, 'success');
      actions.delete.restore();
      assert.end();
    }
  });

  commands.operations.deleteStack(context);
});

test('[commands.operations.monitorStack] failure', function(assert) {
  sinon.stub(actions, 'monitor', function(name, region, pollInterval, callback) {
    callback(new actions.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.equal(err.message, 'Failed during stack monitoring. Stack adjustments will continue.');
      actions.monitor.restore();
      assert.end();
    }
  });

  commands.operations.monitorStack(context);
});

test('[commands.operations.monitorStack] success', function(assert) {
  sinon.stub(actions, 'monitor', function(name, region, pollInterval, callback) {
    assert.equal(name, context.stackName, 'monitor expected stack');
    assert.equal(region, context.stackRegion, 'monitor in expected region');
    assert.equal(pollInterval, 5000, 'monitor with overriden pollInterval');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    monitorInterval: 5000,
    next: function(err) {
      assert.ifError(err, 'success');
      actions.monitor.restore();
      assert.end();
    }
  });

  commands.operations.monitorStack(context);
});

test('[commands.operations.getOldParameters] missing stack', function(assert) {
  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback(new lookup.StackNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof lookup.StackNotFoundError, 'expected error type');
      assert.equal(err.message, 'Missing stack: failure', 'expected error message');
      lookup.parameters.restore();
      assert.end();
    }
  });

  commands.operations.getOldParameters(context);
});

test('[commands.operations.getOldParameters] failed to lookup stack', function(assert) {
  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    callback(new lookup.CloudFormationError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    abort: function(err) {
      assert.ok(err instanceof lookup.CloudFormationError, 'expected error type');
      assert.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
      lookup.parameters.restore();
      assert.end();
    }
  });

  commands.operations.getOldParameters(context);
});

test('[commands.operations.getOldParameters] success', function(assert) {
  sinon.stub(lookup, 'parameters', function(name, region, callback) {
    assert.equal(name, context.stackName, 'lookup expected stack');
    assert.equal(region, context.stackRegion, 'lookup in expected region');
    callback(null, { old: 'parameters' });
  });

  var context = Object.assign({}, basicContext, {
    next: function(err) {
      assert.ifError(err, 'success');
      assert.deepEqual(context.oldParameters, { old: 'parameters' }, 'set context.oldParameters');
      lookup.parameters.restore();
      assert.end();
    }
  });

  commands.operations.getOldParameters(context);
});

test('[commands.operations.promptSaveConfig]', function(assert) {
  sinon.stub(prompt, 'input', function(message, def, callback) {
    assert.equal(message, 'Name for saved configuration:', 'expected prompt');
    assert.equal(def, context.suffix, 'expected default value');
    callback(null, 'chuck');
  });

  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    next: function(err) {
      assert.ifError(err, 'success');
      assert.equal(context.saveName, 'chuck', 'sets context.saveName');
      prompt.input.restore();
      assert.end();
    }
  });

  commands.operations.promptSaveConfig(context);
});

test('[commands.operations.confirmSaveConfig] reject', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    callback(null, false);
  });

  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    abort: function(err) {
      assert.ifError(err, 'aborted');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmSaveConfig(context);
});

test('[commands.operations.confirmSaveConfig] accept', function(assert) {
  sinon.stub(prompt, 'confirm', function(message, callback) {
    assert.equal(message, 'Ready to save this configuration as "hello"?', 'expected message');
    callback(null, true);
  });

  var context = Object.assign({}, basicContext, {
    saveName: 'hello',
    oldParameters: { old: 'parameters' },
    next: function(err) {
      assert.ifError(err, 'success');
      prompt.confirm.restore();
      assert.end();
    }
  });

  commands.operations.confirmSaveConfig(context);
});

test('[commands.operations.saveConfig] bucket not found', function(assert) {
  sinon.stub(actions, 'saveConfiguration', function(name, bucket, config, parameters, kms, callback) {
    callback(new actions.BucketNotFoundError('failure'));
  });

  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    kms: true,
    abort: function(err) {
      assert.ok(err instanceof actions.BucketNotFoundError, 'expected error type');
      assert.equal(err.message, 'Could not find template bucket: failure');
      actions.saveConfiguration.restore();
      assert.end();
    }
  });

  commands.operations.saveConfig(context);
});

test('[commands.operations.saveConfig] failure', function(assert) {
  sinon.stub(actions, 'saveConfiguration', function(name, bucket, config, parameters, kms, callback) {
    callback(new actions.S3Error('failure'));
  });

  var context = Object.assign({}, basicContext, {
    oldParameters: { old: 'parameters' },
    kms: true,
    abort: function(err) {
      assert.ok(err instanceof actions.S3Error, 'expected error type');
      assert.equal(err.message, 'Failed to save template: failure');
      actions.saveConfiguration.restore();
      assert.end();
    }
  });

  commands.operations.saveConfig(context);
});

test('[commands.operations.saveConfig] success', function(assert) {
  sinon.stub(actions, 'saveConfiguration', function(name, bucket, config, parameters, kms, callback) {
    assert.equal(name, context.baseName, 'save under correct stack name');
    assert.equal(bucket, context.configBucket, 'save in correct bucket');
    assert.equal(config, context.saveName, 'save correct config name');
    assert.deepEqual(parameters, { old: 'parameters' }, 'save correct config');
    assert.equal(kms, true, 'use appropriate kms setting');
    callback();
  });

  var context = Object.assign({}, basicContext, {
    saveName: 'chuck',
    oldParameters: { old: 'parameters' },
    overrides: { kms: true },
    next: function(err) {
      assert.ifError(err, 'success');
      actions.saveConfiguration.restore();
      assert.end();
    }
  });

  commands.operations.saveConfig(context);
});
