/* eslint-disable no-console */
const path = require('path');
const test = require('tape');
const sinon = require('sinon');
const commands = require('../lib/commands');
const prompt = require('../lib/prompt');
const actions = require('../lib/actions');
const lookup = require('../lib/lookup');
const template = require('../lib/template');

const opts = {
    name: 'my-stack',
    region: 'us-east-1',
    configBucket: 'my-config-bucket',
    templateBucket: 'my-template-bucket'
};

var basicContext = commands.commandContext(opts, 'testing', [], function() {});

test('[commands.create] no overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.equal(operations.length, 13, '13 operations are run');
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).create('testing', 'templatePath', whenDone);
});

test('[commands.create] with overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.equal(operations.length, 13, '13 operations are run');
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, { some: 'overrides' }, 'sets context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).create('testing', 'templatePath', { some: 'overrides' }, whenDone);
});

test('[commands.create] with template object', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.equal(operations.length, 13, '13 operations are run');
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.deepEqual(context.template, { arbitrary: 'template' }, 'set context.template');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).create('testing', { arbitrary: 'template' }, whenDone);
});

test('[commands.update] no overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.equal(operations.length, 15, '15 operations are run');
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, {}, 'sets empty context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).update('testing', 'templatePath', whenDone);
});

test('[commands.update] with overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, { force: true }, 'sets context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });
        return context;
    });

    commands(opts).update('testing', 'templatePath', { force: true }, whenDone);
});

test('[commands.update] with multiple overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill' }, 'sets context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });
        return context;
    });

    commands(opts).update('testing', 'templatePath', { force: true, masterConfig: 's3://chill' }, whenDone);

});

test('[commands.update] with overrides.skipConfirmParameters', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill', skipConfirmParameters: true }, 'sets context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });
        return context;
    });

    commands(opts).update('testing', 'templatePath', { force: true, masterConfig: 's3://chill', skipConfirmParameters: true }, whenDone);

});

test('[commands.update] with overrides.skipConfirmTemplate', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true }, 'sets context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });
        return context;
    });

    commands(opts).update('testing', 'templatePath', { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true }, whenDone);

});

test('[commands.update] with overrides.skipConfirmParameters and overrides.skipConfirmTemplate', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.template, 'templatePath', 'set context.template');
                t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true, skipConfirmParameters: true }, 'sets context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });
        return context;
    });

    commands(opts).update('testing', 'templatePath', { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true, skipConfirmParameters: true }, whenDone);

});

test('[commands.update] with template object', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.equal(operations.length, 15, '15 operations are run');
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.deepEqual(context.template, { arbitrary: 'template' }, 'set context.template');
                t.deepEqual(context.overrides, {}, 'sets empty context.overrides');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).update('testing', { arbitrary: 'template' }, whenDone);
});

test('[commands.delete] no overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.deepEqual(context.overrides, {}, 'sets empty overrides');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).delete('testing', whenDone);
});

test('[commands.delete] with overrides', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.deepEqual(context.overrides, { force: true }, 'sets empty overrides');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).delete('testing', { force: true }, whenDone);
});

test('[commands.info] success w/o resources', (t) => {
    sinon.stub(lookup, 'info').callsFake(function(name, region, resources, decrypt, callback) {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.notOk(resources, 'lookup.info no resources');
        t.notOk(decrypt, 'lookup.info decrypt=false');
        callback();
    });

    commands(opts).info('testing', function(err) {
        t.ifError(err, 'success');
        lookup.info.restore();
        t.end();
    });
});

test('[commands.info] success w/ resources', (t) => {
    sinon.stub(lookup, 'info').callsFake(function(name, region, resources, decrypt, callback) {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.ok(resources, 'lookup.info no resources');
        t.notOk(decrypt, 'lookup.info decrypt=false');
        callback();
    });

    commands(opts).info('testing', true, function(err) {
        t.ifError(err, 'success');
        lookup.info.restore();
        t.end();
    });
});

test('[commands.info] success w/o decrypt', (t) => {
    sinon.stub(lookup, 'info').callsFake(function(name, region, resources, decrypt, callback) {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.ok(resources, 'lookup.info resources');
        t.notOk(decrypt, 'lookup.info decrypt=false');
        callback();
    });

    commands(opts).info('testing', true, function(err) {
        t.ifError(err, 'success');
        lookup.info.restore();
        t.end();
    });
});

test('[commands.info] success w/ decrypt', (t) => {
    sinon.stub(lookup, 'info').callsFake(function(name, region, resources, decrypt, callback) {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.ok(resources, 'lookup.info resources');
        t.ok(decrypt, 'lookup.info decrypt=true');
        callback();
    });

    commands(opts).info('testing', true, true, function(err) {
        t.ifError(err, 'success');
        lookup.info.restore();
        t.end();
    });
});

test('[commands.info] null provided as suffix', (t) => {
    sinon.stub(lookup, 'info').callsFake(function(name, region, resources, decrypt, callback) {
        t.equal(name, 'my-stack', 'no trailing - on stack name');
        callback();
    });

    commands(opts).info(null, true, function(err) {
        t.ifError(err, 'success');
        lookup.info.restore();
        t.end();
    });
});

test('[commands.save] kms-mode', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.kms, true, 'sets context.kms');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).save('testing', true, whenDone);
});

test('[commands.save] not kms-mode', (t) => {
    function whenDone() {}

    sinon.stub(commands, 'commandContext').callsFake(function(config, suffix, operations, callback) {
        t.deepEqual(config, opts, 'instantiate context with expected config');
        t.deepEqual(suffix, 'testing', 'instantiate context with expected suffix');
        t.ok(operations.every(function(op) { return typeof op === 'function'; }), 'instantiate context with array of operations');
        t.equal(callback, whenDone, 'instantiate context with final callback function');

        var context = Object.assign({}, basicContext, {
            next: function() {
                t.pass('called next to begin process');
                t.equal(context.kms, false, 'sets context.kms');
                commands.commandContext.restore();
                t.end();
            }
        });

        return context;
    });

    commands(opts).save('testing', whenDone);
});

test('[commands.commandContext] sets context', (t) => {
    var context = commands.commandContext(opts, 'testing', opts, function() {});
    t.equal(context.baseName, opts.name, 'sets baseName');
    t.equal(context.suffix, 'testing', 'sets suffix');
    t.equal(context.stackName, opts.name + '-testing', 'sets stackName');
    t.equal(context.stackRegion, opts.region, 'sets stackRegion');
    t.equal(context.configBucket, opts.configBucket, 'sets configBucket');
    t.equal(context.templateBucket, opts.templateBucket, 'sets templateBucket');
    t.deepEqual(context.overrides, {}, 'sets empty overrides');
    t.deepEqual(context.oldParameters, {}, 'sets empty oldParameters');
    t.equal(typeof context.abort, 'function', 'sets abort function');
    t.equal(typeof context.next, 'function', 'sets next function');
    t.end();
});

test('[commands.commandContext] handles null suffix', (t) => {
    var context = commands.commandContext(opts, null, opts, function() {});
    t.equal(context.stackName, opts.name, 'sets stackName without trailing -');
    t.end();
});

test('[commands.commandContext] iterates through operations', (t) => {
    var i = 0;
    var ops = [
        function(context) {
            t.equal(i, 0, 'called first function');
            i++;
            context.next();
        },
        function(context) {
            t.equal(i, 1, 'called second function');
            i++;
            context.next();
        }
    ];

    var context = commands.commandContext(opts, 'testing', ops, function(err, performed) {
        t.ifError(err, 'success');
        t.equal(performed, true, 'the requested command was performed');
        t.end();
    });

    context.next();
});

test('[commands.commandContext] callback with diffs', (t) => {
    var ops = [
        commands.operations.confirmParameters,
        commands.operations.confirmTemplate
    ];

    sinon.stub(prompt, 'confirm').callsFake(() => {
        return Promise.resolve(true);
    });

    var context = commands.commandContext(opts, 'testing', ops, function(err, performed, diffs) {
        t.ifError(err, 'success');
        t.equal(performed, true, 'the requested command was performed');
        t.deepEqual(diffs, {
            parameters: ' {\n\u001b[32m+  newones: "too"\u001b[39m\n }\n',
            template: '\u001b[90m {\n\u001b[39m\u001b[31m-  "old": "template"\n\u001b[39m\u001b[32m+  "new": "template"\n\u001b[39m\u001b[90m }\u001b[39m'
        }, 'callback provides diffs as 3rd arg');
        prompt.confirm.restore();
        t.end();
    });

    context.oldParameters = { old: 'parameters' };
    context.newParameters = { old: 'parameters', newones: 'too' };
    context.oldTemplate = { old: 'template' };
    context.newTemplate = { new: 'template' };

    context.next();
});

test('[commands.commandContext] aborts', (t) => {
    var ops = [
        function(context) { context.abort(); }
    ];

    var context = commands.commandContext(opts, 'testing', ops, function(err, performed) {
        t.ifError(err, 'success');
        t.equal(performed, false, 'the requested command was not performed');
        t.end();
    });

    context.next();
});

test('[commands.commandContext] aborts with error', (t) => {
    var ops = [
        function(context) { context.abort(new Error('failure')); }
    ];

    var context = commands.commandContext(opts, 'testing', ops, function(err, performed) {
        t.equal(err.message, 'failure', 'success');
        t.equal(performed, false, 'the requested command was not performed');
        t.end();
    });

    context.next();
});

test('[commands.operations.updatePreamble] no template', (t) => {
    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback();
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: No template passed', 'expected error message');
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] templatePath not found', (t) => {
    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback();
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        template: '/tmp/invalid/path/nonono.template.json',
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: /tmp/invalid/path/nonono.template.json does not exist', 'expected error message');
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] template invalid', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback(new template.InvalidTemplateError('failure'));
    });

    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback();
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof template.InvalidTemplateError, 'expected error type');
            t.equal(err.message, 'Could not parse template: failure', 'expected error message');
            template.read.restore();
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] stack not found for parameters', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback();
    });

    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback(new lookup.StackNotFoundError('failure'));
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof lookup.StackNotFoundError, 'expected error type');
            t.equal(err.message, 'Missing stack: failure', 'expected error message');
            template.read.restore();
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] failure getting stack parameters', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback();
    });

    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback(new lookup.CloudFormationError('failure'));
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof lookup.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
            template.read.restore();
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] stack not found for template', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback();
    });

    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback();
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback(new lookup.StackNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof lookup.StackNotFoundError, 'expected error type');
            t.equal(err.message, 'Missing stack: failure', 'expected error message');
            template.read.restore();
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] failure getting stack template', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback();
    });

    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback();
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback(new lookup.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        next: function() {
            t.fail('should not call next');
        },
        abort: function(err) {
            t.ok(err instanceof lookup.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
            template.read.restore();
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] success', (t) => {
    sinon.stub(template, 'read').callsFake(function(template, options, callback) {
        t.equal(template, path.resolve('example.template.json'), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        callback(null, { new: 'template' });
    });

    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback(null, { old: 'parameters' });
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback(null, { old: 'template' });
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        overrides: { templateOptions: { template: 'options' } },
        next: function() {
            t.pass('calls next()');
            t.deepEqual(context.newTemplate, { new: 'template' }, 'sets context.newTemplate');
            t.deepEqual(context.oldTemplate, { old: 'template' }, 'sets context.oldTemplate');
            t.deepEqual(context.oldParameters, { old: 'parameters' }, 'sets context.oldParameters');
            template.read.restore();
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.updatePreamble] success with template object', (t) => {
    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback(null, { old: 'parameters' });
    });

    sinon.stub(lookup, 'template').callsFake(function(name, region, callback) {
        callback(null, { old: 'template' });
    });

    var context = Object.assign({}, basicContext, {
        template: { arbitrary: 'template' },
        next: function() {
            t.pass('calls next()');
            t.deepEqual(context.newTemplate, { arbitrary: 'template' }, 'sets context.newTemplate');
            t.deepEqual(context.oldTemplate, { old: 'template' }, 'sets context.oldTemplate');
            t.deepEqual(context.oldParameters, { old: 'parameters' }, 'sets context.oldParameters');
            lookup.parameters.restore();
            lookup.template.restore();
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        }
    });

    commands.operations.updatePreamble(context);
});

test('[commands.operations.getMasterConfig] success', (t) => {

    sinon.stub(lookup, 'defaultConfiguration').callsFake(function(s3Url, callback) {
        callback(null, { old: 'fresh' });
    });

    var context = Object.assign({}, basicContext, {
        overrides: { masterConfig: 's3://chill.cfn.json' },
        next: function() {
            t.pass('calls next()');
            t.deepEqual(context.oldParameters, { old: 'secure:staleelats' }, 'sets context.oldParameters');
            lookup.defaultConfiguration.restore();
            t.end();
        },
        abort: function(err) {
            if (err) t.error(err, 'failed');
        }
    });


    context.oldParameters = { old: 'secure:staleelats' };
    commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] no-op', (t) => {

    sinon.stub(lookup, 'defaultConfiguration').callsFake(function(s3Url, callback) {
        callback(null, { old: 'fresh' });
    });

    var context = Object.assign({}, basicContext, {
        overrides: {},
        next: function() {
            t.pass('calls next()');
            t.deepEqual(context.oldParameters, { old: 'stale' }, 'context.oldParameters stays the same');
            lookup.defaultConfiguration.restore();
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        }
    });

    context.oldParameters = { old: 'stale' };
    commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] failed', (t) => {

    sinon.stub(lookup, 'defaultConfiguration').callsFake(function(s3Url, callback) {
        callback(new Error(), {});
    });

    var context = Object.assign({}, basicContext, {
        overrides: { masterConfig: 's3://unchill.cfn.json' },
        next: function() {
            t.fail('should not call next');
        },
        abort: function() {
            lookup.defaultConfiguration.restore();
            t.end();
        }
    });

    context.oldParameters = { old: 'stale' };
    commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] no matching oldParameters does not put masterConfig keys into oldParameters for better looking diff at the end', (t) => {

    sinon.stub(lookup, 'defaultConfiguration').callsFake(function(s3Url, callback) {
        callback(null, { bingo: 'fresh' });
    });

    var context = Object.assign({}, basicContext, {
        overrides: { masterConfig: 's3://chill.cfn.json' },
        next: function() {
            t.pass('calls next()');
            t.deepEqual(context.oldParameters, { old: 'stale' }, 'leaves context.oldParameters alone');
            lookup.defaultConfiguration.restore();
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        }
    });

    context.oldParameters = { old: 'stale' };
    commands.operations.getMasterConfig(context);
});

test('[commands.operations.getMasterConfig] adding a newParameter that matches masterConfig parameter does not get overwritten, so that user is intentional in adding newParameters', (t) => {

    sinon.stub(lookup, 'defaultConfiguration').callsFake(function(s3Url, callback) {
        callback(null, { old: 'fresh' });
    });

    var context = Object.assign({}, basicContext, {
        overrides: { masterConfig: 's3://chill.cfn.json' },
        next: function() {
            t.pass('calls next()');
            t.deepEqual(context.oldParameters, { hello: 'goodbye' }, 'no matching keys between oldParameters and masterConfig, no oldParameters are replaced');
            t.deepEqual(context.newTemplate.Parameters, { old: 'special whale' }, 'newParameters are not replaced despite matching keys');
            lookup.defaultConfiguration.restore();
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        }
    });

    context.oldParameters = { hello: 'goodbye' };
    context.newTemplate = {};
    context.newTemplate.Parameters = { old: 'special whale' };
    commands.operations.getMasterConfig(context);
});

test('[commands.operations.promptParameters] force-mode', (t) => {
    sinon.stub(template, 'questions').callsFake(function() {
        t.fail('should not build questions');
    });

    var context = Object.assign({}, basicContext, {
        newTemplate: { Parameters: { old: {}, new: {} } },
        oldParameters: { old: 'parameters', extra: 'value' },
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newParameters, { old: 'parameters' }, 'sets new parameters to old values, excluding values not present in template');
            t.notOk(context.newParameters.new, 'does not provide a parameter value if no default for it was found');
            template.questions.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] not force-mode', (t) => {
    var questions = { parameter: 'questions' };
    var answers = { parameter: 'answers' };

    sinon.stub(template, 'questions').callsFake(function(template, overrides) {
        t.deepEqual(template, { new: 'template' }, 'builds questions for new template');
        t.deepEqual(overrides, { defaults: { old: 'parameters' }, kmsKeyId: undefined, region: 'us-east-1' }, 'uses old parameters as default values');
        return questions;
    });

    sinon.stub(prompt, 'parameters').callsFake((question) => {
        t.deepEqual(question, questions, 'prompts for derived questions');
        return Promise.resolve(answers);
    });

    var context = Object.assign({}, basicContext, {
        newTemplate: { new: 'template' },
        oldParameters: { old: 'parameters' },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newParameters, answers, 'sets new parameters to prompt responses');
            template.questions.restore();
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] with parameter and kms overrides', (t) => {
    sinon.stub(template, 'questions').callsFake(function(template, overrides) {
        t.deepEqual(overrides, { defaults: { old: 'overriden' }, kmsKeyId: 'this is a bomb key', region: 'us-west-2' }, 'uses override parameters');
        return { parameter: 'questions' };
    });

    sinon.stub(prompt, 'parameters').callsFake(() => {
        return Promise.resolve({ the: 'answers' });
    });

    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: { old: 'parameters' },
        overrides: { parameters: { old: 'overriden' }, kms: 'this is a bomb key' },
        next: function(err) {
            t.ifError(err, 'success');
            template.questions.restore();
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] force-mode with no parameters in new template', (t) => {
    var context = Object.assign({}, basicContext, {
        newTemplate: { new: 'template' },
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newParameters, {}, 'sets context.newParameters to empty');
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] reject overrides that are not in old or new template', (t) => {
    sinon.stub(prompt, 'parameters').callsFake(() => {
        return Promise.resolve({ some: 'answers' });
    });

    var context = Object.assign({}, basicContext, {
        newTemplate: { Parameters: { Name: {} } },
        oldParameters: { Name: 'name', Age: 'age' },
        overrides: { parameters: { Name: 'overriden', Born: 'ignored' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.notOk(context.oldParameters.Born, 'excludes extraneous parameter override');
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] changesetParameters use previous value for unchanged parameter values', (t) => {
    var oldParameters = { old: 'parameters', the: 'answers' };
    var newParameters = { old: 'newvalue', the: 'answers' };

    sinon.stub(prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: oldParameters,
        overrides: {},
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'old', ParameterValue: 'newvalue' }, { ParameterKey: 'the', UsePreviousValue: true }]);
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] changesetParameters does not set UsePreviousValue when overrides set the value', (t) => {
    var oldParameters = { beep: 'boop' };
    var newParameters = { beep: 'boop' };

    sinon.stub(prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: oldParameters,
        overrides: { parameters: { beep: 'boop' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', ParameterValue: 'boop' }]);
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] changesetParameters sets UsePreviousValue to true in the absence of overrides', (t) => {
    var oldParameters = { beep: 'bop' };
    var newParameters = { beep: 'bop' };

    sinon.stub(prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: oldParameters,
        overrides: {},
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', UsePreviousValue: true }]);
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] do not set UsePreviousValue when creating a new stack', (t) => {
    var oldParameters = { beep: 'boop' };
    var newParameters = { beep: 'boop' };

    sinon.stub(prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        create: true,
        oldParameters: oldParameters,
        overrides: { parameters: { beep: 'boop' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.ok(context.create, 'context.create is set to true');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', ParameterValue: 'boop' }]);
            prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.confirmParameters] force-mode', (t) => {
    var context = Object.assign({}, basicContext, {
        overrides: { force: true },
        oldParameters: { old: 'parameters' },
        newParameters: { old: 'parameters' },
        next: function() {
            t.pass('skipped prompting');
            t.end();
        }
    });

    commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmParameters] no difference', (t) => {
    var context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        newParameters: { old: 'parameters' },
        next: function() {
            t.pass('skipped prompting');
            t.end();
        }
    });

    commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmParameters] preapproved', async(t) => {
    sinon.stub(console, 'log');

    const context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        newParameters: { old: 'parameters', newones: 'too' },
        overrides: {
            preapproved: { parameters: [' {\n\u001b[32m+  newones: "too"\u001b[39m\n }\n'] }
        },
        next: function() {
            t.ok(console.log.calledWith('Auto-confirming parameter changes... Changes were pre-approved in another region.'), 'Skip notice printed');
            t.pass('skipped prompting');
            t.ok(context.overrides.skipConfirmParameters, 'sets skipConfirmParameters');
            console.log.restore();
            t.end();
        }
    });

    await commands.operations.confirmParameters(context);
});

test('[commands.operations.confirmParameters] rejected', async(t) => {
    t.plan(2);

    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameterz"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
        return Promise.resolve(false);
    });

    await commands.operations.confirmParameters(Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        newParameters: { new: 'parameterz' },
        overrides: {},
        next: function() {
            t.fail('should not proceed');
        },
        abort: function(err) {
            t.ifError(err, 'aborted');
            prompt.confirm.restore();
            t.end();
        }
    }));
});

test('[commands.operations.confirmParameters] accepted', async(t) => {
    t.plan(2);

    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameters"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    await commands.operations.confirmParameters(Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        newParameters: { new: 'parameters' },
        overrides: {},
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();
            t.end();
        },
        abort: function() {
            t.fail('should proceed');
        }
    }));
});

test('[commands.operations.confirmTemplate] no difference', (t) => {
    var context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { old: 'template' },
        next: function() {
            t.pass('skipped prompting');
            t.end();
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] undefined', (t) => {
    var context = Object.assign({}, basicContext, {
        oldTemplate: { Parameters: { old: undefined } },
        newTemplate: { Parameters: {} },
        next: function() {
            t.pass('skipped prompting');
            t.end();
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] force-mode', (t) => {
    var context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'should proceed');
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'should not proceed');
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] preapproved', (t) => {
    sinon.stub(console, 'log');

    var context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        overrides: {
            preapproved: {
                template: ['\u001b[90m {\n\u001b[39m\u001b[31m-  "old": "template"\n\u001b[39m\u001b[32m+  "new": "template"\n\u001b[39m\u001b[90m }\u001b[39m']
            }
        },
        next: (err) => {
            t.ok(console.log.calledWith('Auto-confirming template changes... Changes were pre-approved in another region.'), 'Skip notice printed');
            t.ifError(err, 'should proceed');
            t.ok(context.overrides.skipConfirmTemplate, 'sets skipConfirmTemplate');
            t.end();
            console.log.restore();
        },
        abort: (err) => {
            t.ifError(err, 'should not proceed');
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] rejected', (t) => {
    t.plan(2);

    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(
            message,
            '\x1b[90m {\n\x1b[39m\x1b[31m-  "old": "template"\n\x1b[39m\x1b[32m+  "new": "template"\n\x1b[39m\x1b[90m }\x1b[39m\nAccept template changes?',
            'prompted appropriate message');
        return Promise.resolve(false);
    });

    basicContext.overrides = {}; // some previous test has mutated this

    var context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        next: function() {
            t.fail('should not proceed');
        },
        abort: function(err) {
            t.ifError(err, 'aborted');
            prompt.confirm.restore();
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] accepted', (t) => {
    t.plan(2);

    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(message, '\x1b[90m {\n\x1b[39m\x1b[31m-  "old": "template"\n\x1b[39m\x1b[32m+  "new": "template"\n\x1b[39m\x1b[90m }\x1b[39m\nAccept template changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    var context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();

        },
        abort: function() {
            t.fail('should not abort');
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] lengthy diff, first unchanged section ignored', (t) => {
    t.plan(2);

    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(message, '\x1b[90m {\n   "a": "lines",\n   "aa": "lines",\n\x1b[39m\x1b[31m-  "and": "will change too",\n\x1b[39m\x1b[32m+  "and": "has changed",\n\x1b[39m\x1b[90m   "b": "lines",\n   "ba": "lines",\n   "c": "lines",\n\x1b[39m\x1b[90m\n---------------------------------------------\n\n\x1b[39m\x1b[90m   "r": "lines",\n   "s": "lines",\n   "t": "lines",\n\x1b[39m\x1b[31m-  "this": "will change",\n\x1b[39m\x1b[32m+  "this": "has changed",\n\x1b[39m\x1b[90m   "u": "lines",\n   "v": "lines"\n }\x1b[39m\nAccept template changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    var context = Object.assign({}, basicContext, {
        oldTemplate: {
            old: 'template',
            a: 'lines',
            b: 'lines',
            c: 'lines',
            d: 'lines',
            e: 'lines',
            f: 'lines',
            g: 'lines',
            h: 'lines',
            i: 'lines',
            j: 'lines',
            k: 'lines',
            this: 'will change',
            l: 'lines',
            m: 'lines',
            n: 'lines',
            o: 'lines',
            p: 'lines',
            q: 'lines',
            r: 'lines',
            s: 'lines',
            t: 'lines',
            u: 'lines',
            v: 'lines',
            and: 'will change too',
            aa: 'lines',
            ba: 'lines',
            ca: 'lines',
            da: 'lines',
            ea: 'lines',
            fa: 'lines',
            ga: 'lines',
            ha: 'lines',
            ia: 'lines',
            ja: 'lines',
            ka: 'lines'
        },
        newTemplate: {
            old: 'template',
            a: 'lines',
            b: 'lines',
            c: 'lines',
            d: 'lines',
            e: 'lines',
            f: 'lines',
            g: 'lines',
            h: 'lines',
            i: 'lines',
            j: 'lines',
            k: 'lines',
            this: 'has changed',
            l: 'lines',
            m: 'lines',
            n: 'lines',
            o: 'lines',
            p: 'lines',
            q: 'lines',
            r: 'lines',
            s: 'lines',
            t: 'lines',
            u: 'lines',
            v: 'lines',
            and: 'has changed',
            aa: 'lines',
            ba: 'lines',
            ca: 'lines',
            da: 'lines',
            ea: 'lines',
            fa: 'lines',
            ga: 'lines',
            ha: 'lines',
            ia: 'lines',
            ja: 'lines',
            ka: 'lines'
        },
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();

        },
        abort: function() {
            t.fail('should not abort');
        }
    });

    commands.operations.confirmTemplate(context);
});

test('[commands.operations.saveTemplate] bucket not found', (t) => {
    var url = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

    sinon.stub(actions, 'templateUrl').callsFake(function() {
        return url;
    });

    sinon.stub(actions, 'saveTemplate').callsFake(function(url, template, callback) {
        callback(new actions.BucketNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof actions.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find template bucket: failure', 'expected error message');
            actions.templateUrl.restore();
            actions.saveTemplate.restore();
            t.end();
        }
    });

    commands.operations.saveTemplate(context);
});

test('[commands.operations.saveTemplate] failed to save template', (t) => {
    var url = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

    sinon.stub(actions, 'templateUrl').callsFake(function() {
        return url;
    });

    sinon.stub(actions, 'saveTemplate').callsFake(function(url, template, callback) {
        callback(new actions.S3Error('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof actions.S3Error, 'expected error type');
            t.equal(err.message, 'Failed to save template: failure', 'expected error message');
            actions.templateUrl.restore();
            actions.saveTemplate.restore();
            t.end();
        }
    });

    commands.operations.saveTemplate(context);
});

test('[commands.operations.saveTemplate] success', (t) => {
    var templateUrl = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

    sinon.stub(actions, 'templateUrl').callsFake(function(bucket, region, suffix) {
        t.equal(bucket, context.templateBucket, 'template url in proper bucket');
        t.equal(region, context.stackRegion, 'template url in proper region');
        t.equal(suffix, context.suffix, 'template url for correct suffix');
        return templateUrl;
    });

    sinon.stub(actions, 'saveTemplate').callsFake(function(url, template, callback) {
        t.equal(url, templateUrl, 'saved to correct url');
        t.equal(template, '{\n  "new": "template"\n}', 'saved correct template');
        callback();
    });

    var context = Object.assign({}, basicContext, {
        newTemplate: { new: 'template' },
        next: function(err) {
            t.ifError(err, 'success');
            t.equal(context.templateUrl, templateUrl, 'sets template url');
            actions.templateUrl.restore();
            actions.saveTemplate.restore();
            t.end();
        }
    });

    commands.operations.saveTemplate(context);
});

test('[commands.operations.validateTemplate] invalid', (t) => {
    sinon.stub(actions, 'validate').callsFake(function(region, url, callback) {
        callback(new actions.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
        abort: function(err) {
            t.ok(err instanceof actions.CloudFormationError, 'correct error type');
            t.equal(err.message, 'Invalid template: failure', 'expected error message');
            actions.validate.restore();
            t.end();
        }
    });

    commands.operations.validateTemplate(context);
});

test('[commands.operations.validateTemplate] valid', (t) => {
    t.plan(3);

    sinon.stub(actions, 'validate').callsFake(function(region, url, callback) {
        t.equal(region, context.stackRegion, 'validate in proper region');
        t.equal(url, context.templateUrl, 'validate proper template');
        callback();
    });

    var context = Object.assign({}, basicContext, {
        templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
        abort: function() {
            t.fail('failed');
        },
        next: function(err) {
            t.ifError(err, 'success');
            actions.validate.restore();
        }
    });

    commands.operations.validateTemplate(context);
});

test('[commands.operations.beforeUpdateHook] no hook', (t) => {
    var context = Object.assign({}, basicContext, {
        abort: function() {
            t.fail('failed');
        },
        next: function(err) {
            t.ifError(err, 'success');
            t.end();
        }
    });

    commands.operations.beforeUpdateHook(context);
});

test('[commands.operations.validateParametersHook] no hook', (t) => {
    var context = Object.assign({}, basicContext, {
        abort: function() {
            t.fail('failed');
        },
        next: function(err) {
            t.ifError(err, 'success');
            t.end();
        }
    });

    commands.operations.validateParametersHook(context);
});

test('[commands.operations.validateParametersHook] hook error', (t) => {
    var context = Object.assign({}, basicContext, {
        overrides: {
            validateParameters: function(context, callback) {
                callback(new Error('failure'));
            }
        },
        abort: function(err) {
            t.equal(err.message, 'failure', 'passed through error on abort');
            t.end();
        },
        next: function() {
            t.fail('should not proceed');
        }
    });

    commands.operations.validateParametersHook(context);
});

test('[commands.operations.validateParametersHook] hook success', (t) => {
    t.plan(2);
    var context = Object.assign({}, basicContext, {
        overrides: {
            validateParameters: function(arg, callback) {
                t.deepEqual(arg, context, 'provided hook with runtime context');
                callback();
            }
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        },
        next: function() {
            t.pass('should proceed');
        }
    });

    commands.operations.validateParametersHook(context);
});

test('[commands.operations.beforeUpdateHook] hook error', (t) => {
    var context = Object.assign({}, basicContext, {
        overrides: {
            beforeUpdate: function(context, callback) {
                callback(new Error('failure'));
            }
        },
        abort: function(err) {
            t.equal(err.message, 'failure', 'passed through error on abort');
            t.end();
        },
        next: function() {
            t.fail('should not proceed');
        }
    });

    commands.operations.beforeUpdateHook(context);
});

test('[commands.operations.beforeUpdateHook] hook success', (t) => {
    t.plan(2);

    var context = Object.assign({}, basicContext, {
        overrides: {
            beforeUpdate: function(arg, callback) {
                t.deepEqual(arg, context, 'provided hook with runtime context');
                callback();
            }
        },
        abort: function(err) {
            t.ifError(err, 'failed');
        },
        next: function() {
            t.pass('should proceed');
        }
    });

    commands.operations.beforeUpdateHook(context);
});

test('[commands.operations.getChangeset] failure', (t) => {
    sinon.stub(actions, 'diff').callsFake(function(name, region, changeSetType, url, params, expand, callback) {
        callback(new actions.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof actions.CloudFormationError, 'correct error type');
            t.equal(err.message, 'Failed to generate changeset: failure', 'expected error message');
            actions.diff.restore();
            t.end();
        },
        next: function() {
            t.fail('should not proceed');
        }
    });

    commands.operations.getChangeset(context);
});

test('[commands.operations.getChangeset] success', (t) => {
    t.plan(8);

    var details = { changeset: 'details' };

    sinon.stub(actions, 'diff').callsFake(function(name, region, changeSetType, url, params, expand, callback) {
        t.equal(name, context.stackName, 'changeset for correct stack');
        t.equal(region, context.stackRegion, 'changeset in the correct region');
        t.equal(changeSetType, 'UPDATE', 'changeSetType set correctly');
        t.equal(url, context.templateUrl, 'changeset for the correct template');
        t.deepEqual(params, context.changesetParameters, 'changeset using changeset parameters');
        t.equal(expand, context.overrides.expand, 'changeset using override properties');
        callback(null, details);
    });

    var context = Object.assign({}, basicContext, {
        stackName: 'my-stack-testing',
        stackRegion: 'us-east-1',
        newParameters: { new: 'parameters' },
        changesetParameters: { ParameterKey: 'new', ParameterValue: 'parameters' },
        templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
        overrides: { expand: true },
        abort: function() {
            t.fail('should not abort');
        },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changeset, details, 'sets context.changeset');
            actions.diff.restore();
            t.end();
        }
    });

    commands.operations.getChangeset(context, 'UPDATE');
});

test('[commands.operations.getChangesetCreate] success', (t) => {
    t.plan(1);

    sinon.stub(commands.operations, 'getChangeset').callsFake(function(context, changeSetType) {
        t.equals(changeSetType, 'CREATE', 'has changeSetType');
        context.next();
    });

    const context = {
        next: function() {
            commands.operations.getChangeset.restore();
            t.end();
        }
    };

    commands.operations.getChangesetCreate(context);
});

test('[commands.operations.getChangesetUpdate] success', (t) => {
    t.plan(1);

    sinon.stub(commands.operations, 'getChangeset').callsFake(function(context, changeSetType) {
        t.equals(changeSetType, 'UPDATE', 'has changeSetType');
        context.next();
    });

    const context = {
        next: function() {
            commands.operations.getChangeset.restore();
            t.end();
        }
    };

    commands.operations.getChangesetUpdate(context);
});

test('[commands.operations.confirmChangeset] force-mode', (t) => {
    var context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function() {
            t.pass('accepted with no prompt');
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'should not abort');
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] skipConfirmParams && skipConfirmTemplate', (t) => {
    var context = Object.assign({}, basicContext, {
        overrides: { skipConfirmParameters: true, skipConfirmTemplate: true },
        next: function() {
            t.pass('accepted with no prompt');
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'should not abort');
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] rejected', (t) => {
    sinon.stub(prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(defaultValue, false);
        return Promise.resolve(false);
    });

    var context = Object.assign({}, basicContext, {
        changeset: { changes: [] },
        abort: function(err) {
            t.ifError(err, 'aborted');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] acccepted', (t) => {
    t.plan(3);

    sinon.stub(prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, '\n\n\nAccept changes and update the stack?', 'expected message');
        t.equal(defaultValue, false);
        return Promise.resolve(true);
    });

    var context = Object.assign({}, basicContext, {
        changeset: { changes: [] },
        abort: function() {
            t.fail('should not abort');
        },
        next: function() {
            t.pass('success');
            prompt.confirm.restore();
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] changeset formatting', (t) => {
    sinon.stub(prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, 'Action  Name  Type  Replace\n------  ----  ----  -------\n\x1b[33mModify\x1b[39m  name  type  \x1b[31mtrue\x1b[39m   \n\x1b[32mAdd\x1b[39m     name  type  \x1b[32mfalse\x1b[39m  \n\x1b[31mRemove\x1b[39m  name  type  \x1b[32mfalse\x1b[39m  \n\nAccept changes and update the stack?', 'expected message (with colors)');
        t.equal(defaultValue, false);
        return Promise.resolve(true);
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
            t.fail('should not abort');
        },
        next: function() {
            t.pass('success');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.executeChangeSet] failure', (t) => {
    sinon.stub(actions, 'executeChangeSet').callsFake(function(name, region, id, callback) {
        callback(new actions.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        changeset: { id: 'changeset:arn' },
        abort: function(err) {
            t.ok(err instanceof actions.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to execute changeset: failure');
            actions.executeChangeSet.restore();
            t.end();
        }
    });

    commands.operations.executeChangeSet(context);
});

test('[commands.operations.executeChangeSet] not executable', (t) => {
    sinon.stub(actions, 'executeChangeSet').callsFake(function(name, region, id, callback) {
        var err = new actions.ChangeSetNotExecutableError('failure');
        err.execution = 'OBSOLETE';
        err.reason = 'outdated';
        callback(err);
    });

    var context = Object.assign({}, basicContext, {
        changeset: { id: 'changeset:arn' },
        abort: function(err) {
            t.ok(err instanceof actions.ChangeSetNotExecutableError, 'expected error type');
            t.equal(err.message, 'Status: OBSOLETE | Reason: outdated | failure', 'expected error message');
            actions.executeChangeSet.restore();
            t.end();
        }
    });

    commands.operations.executeChangeSet(context);
});

test('[commands.operations.executeChangeSet] success', (t) => {
    t.plan(4);

    sinon.stub(actions, 'executeChangeSet').callsFake(function(name, region, id, callback) {
        t.equal(name, context.stackName, 'execute on proper stack');
        t.equal(region, context.stackRegion, 'execute in proper region');
        t.equal(id, context.changeset.id, 'execute proper changeset');
        callback();
    });

    var context = Object.assign({}, basicContext, {
        changeset: { id: 'changeset:arn' },
        next: function() {
            t.pass('success');
            actions.executeChangeSet.restore();
            t.end();
        }
    });

    commands.operations.executeChangeSet(context);
});

test('[commands.operations.createPreamble] no template', (t) => {
    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: No template passed');
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] template not found', (t) => {
    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        template: '/tmp/invalid/path/nonono.template.json',
        abort: function(err) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: /tmp/invalid/path/nonono.template.json does not exist', 'expected error message');
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] template invalid', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback(new template.InvalidTemplateError('failure'));
    });

    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        callback();
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof template.InvalidTemplateError, 'expected error type');
            t.equal(err.message, 'Could not parse template: failure');
            template.read.restore();
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] config bucket not found', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback();
    });

    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        callback(new lookup.BucketNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof lookup.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find config bucket: failure');
            template.read.restore();
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] failed to read configurations', (t) => {
    sinon.stub(template, 'read').callsFake(function(templatePath, options, callback) {
        callback();
    });

    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        callback(new lookup.S3Error('failure'));
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof lookup.S3Error, 'expected error type');
            t.equal(err.message, 'Could not load saved configurations: failure');
            template.read.restore();
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] success', (t) => {
    sinon.stub(template, 'read').callsFake(function(template, options, callback) {
        t.equal(template, path.resolve('example.template.json'), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        callback(null, { new: 'template' });
    });

    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        t.equal(name, context.baseName, 'lookup correct stack configurations');
        t.equal(bucket, context.configBucket, 'lookup in correct bucket');
        callback(null, ['config']);
    });

    var context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        overrides: { templateOptions: { template: 'options' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newTemplate, { new: 'template' }, 'set context.newTemplate');
            t.deepEqual(context.configNames, ['config'], 'set context.configNames');
            t.ok(context.create, 'context.create is set to true');
            template.read.restore();
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] success with template object', (t) => {
    sinon.stub(template, 'read').callsFake(function(template, options, callback) {
        t.equal(template, path.resolve(context.template), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        callback(null, context.template);
    });

    sinon.stub(lookup, 'configurations').callsFake(function(name, bucket, region, callback) {
        t.equal(name, context.baseName, 'lookup correct stack configurations');
        t.equal(bucket, context.configBucket, 'lookup in correct bucket');
        callback(null, ['config']);
    });

    var context = Object.assign({}, basicContext, {
        template: { arbitrary: 'template' },
        overrides: { templateOptions: { template: 'options' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newTemplate, context.template, 'set context.newTemplate');
            t.deepEqual(context.configNames, ['config'], 'set context.configNames');
            t.ok(context.create, 'context.create is set to true');
            template.read.restore();
            lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.selectConfig] force-mode', (t) => {
    sinon.stub(prompt, 'configuration').callsFake(function(configs, callback) {
        t.fail('should not prompt');
        callback(new Error('failure'));
    });

    var context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'success');
            t.notOk(context.configName, 'does not set context.configName');
            prompt.configuration.restore();
            t.end();
        }
    });

    commands.operations.selectConfig(context);
});

test('[commands.operations.selectConfig] new config', (t) => {
    sinon.stub(prompt, 'configuration').callsFake((configs) => {
        t.deepEqual(configs, context.configNames, 'prompted with correct config names');
        return Promise.resolve('New configuration');
    });

    var context = Object.assign({}, basicContext, {
        configNames: ['config'],
        next: function(err) {
            t.ifError(err, 'success');
            t.notOk(context.configName, 'does not set context.configName');
            prompt.configuration.restore();
            t.end();
        }
    });

    commands.operations.selectConfig(context);
});

test('[commands.operations.selectConfig] saved config', (t) => {
    sinon.stub(prompt, 'configuration').callsFake((configs) => {
        t.deepEqual(configs, context.configNames, 'prompted with correct config names');
        return Promise.resolve('config');
    });

    var context = Object.assign({}, basicContext, {
        configNames: ['config'],
        next: function(err) {
            t.ifError(err, 'success');
            t.equal(context.configName, 'config', 'does set context.configName');
            prompt.configuration.restore();
            t.end();
        }
    });

    commands.operations.selectConfig(context);
});

test('[commands.operations.loadConfig] no saved config, no default', (t) => {
    var context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, {}, 'does not set context.oldParameters');
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] no saved config, has default', (t) => {
    sinon.stub(lookup, 'defaultConfiguration').callsFake(function(s3url, callback) {
        t.equal(s3url, 's3://my-bucket/my-default.cfn.json', 'requested correct configuration');
        callback(null, { default: 'configuration' });
    });

    var context = Object.assign({}, basicContext, {
        overrides: { defaultConfig: 's3://my-bucket/my-default.cfn.json' },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, { default: 'configuration' }, 'sets context.oldParameters');
            lookup.defaultConfiguration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] bucket not found', (t) => {
    sinon.stub(lookup, 'configuration').callsFake(function(name, bucket, config, callback) {
        callback(new lookup.BucketNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof lookup.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find config bucket: failure', 'expected error message');
            lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] config not found', (t) => {
    sinon.stub(lookup, 'configuration').callsFake(function(name, bucket, config, callback) {
        callback(new lookup.ConfigurationNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof lookup.ConfigurationNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find saved configuration: failure', 'expected error message');
            lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] invalid config', (t) => {
    sinon.stub(lookup, 'configuration').callsFake(function(name, bucket, config, callback) {
        callback(new lookup.InvalidConfigurationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof lookup.InvalidConfigurationError, 'expected error type');
            t.equal(err.message, 'Saved configuration error: failure', 'expected error message');
            lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] failed to load config', (t) => {
    sinon.stub(lookup, 'configuration').callsFake(function(name, bucket, config, callback) {
        callback(new lookup.S3Error('failure'));
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof lookup.S3Error, 'expected error type');
            t.equal(err.message, 'Failed to read saved configuration: failure', 'expected error message');
            lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] success', (t) => {
    sinon.stub(lookup, 'configuration').callsFake(function(name, bucket, config, callback) {
        t.equal(name, context.baseName, 'expected stack name');
        t.equal(bucket, context.configBucket, 'expected config bucket');
        t.equal(config, context.configName, 'expected config name');
        callback(null, { saved: 'configuration' });
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, { saved: 'configuration' }, 'set context.oldParameters');
            lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.confirmCreate] force-mode', (t) => {
    sinon.stub(prompt, 'confirm').callsFake(function(message, callback) {
        t.fail('should not prompt');
        callback(new Error('failure'));
    });

    var context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmCreate] reject', (t) => {
    sinon.stub(prompt, 'confirm').callsFake(() => {
        return Promise.resolve(false);
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ifError(err, 'aborted');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmCreate] accept', (t) => {
    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(message, 'Ready to create the stack?', 'expected message');
        return Promise.resolve(true);
    });

    var context = Object.assign({}, basicContext, {
        configName: 'config',
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmDelete] force-mode', (t) => {
    var context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'no prompt');
            t.end();
        }
    });

    commands.operations.confirmDelete(context);
});

test('[commands.operations.confirmDelete] reject', (t) => {
    sinon.stub(prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, 'Are you sure you want to delete my-stack-testing in region us-east-1?');
        t.equal(defaultValue, false);
        return Promise.resolve(false);
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ifError(err, 'aborted');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmDelete(context);
});

test('[commands.operations.confirmDelete] accept', (t) => {
    sinon.stub(prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, 'Are you sure you want to delete my-stack-testing in region us-east-1?', 'expected message');
        t.equal(defaultValue, false);
        return Promise.resolve(true);
    });

    var context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmDelete(context);
});

test('[commands.operations.deleteStack] failure', (t) => {
    sinon.stub(actions, 'delete').callsFake(function(name, region, callback) {
        callback(new actions.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof actions.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to delete stack: failure', 'expected error message');
            actions.delete.restore();
            t.end();
        }
    });

    commands.operations.deleteStack(context);
});

test('[commands.operations.deleteStack] success', (t) => {
    sinon.stub(actions, 'delete').callsFake(function(name, region, callback) {
        t.equal(name, context.stackName, 'deleted expected stack');
        t.equal(region, context.stackRegion, 'deleted in expected region');
        callback();
    });

    var context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            actions.delete.restore();
            t.end();
        }
    });

    commands.operations.deleteStack(context);
});

test('[commands.operations.monitorStack] failure', (t) => {
    sinon.stub(actions, 'monitor').callsFake(function(name, region, callback) {
        callback(new actions.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.equal(err.message, `Monitoring your deploy failed, but the deploy in region ${context.stackRegion} will continue. Check on your stack's status in the CloudFormation console.`);
            actions.monitor.restore();
            t.end();
        }
    });

    commands.operations.monitorStack(context);
});

test('[commands.operations.monitorStack] success', (t) => {
    sinon.stub(actions, 'monitor').callsFake(function(name, region, callback) {
        t.equal(name, context.stackName, 'monitor expected stack');
        t.equal(region, context.stackRegion, 'monitor in expected region');
        callback();
    });

    var context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            actions.monitor.restore();
            t.end();
        }
    });

    commands.operations.monitorStack(context);
});

test('[commands.operations.getOldParameters] missing stack', (t) => {
    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback(new lookup.StackNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof lookup.StackNotFoundError, 'expected error type');
            t.equal(err.message, 'Missing stack: failure', 'expected error message');
            lookup.parameters.restore();
            t.end();
        }
    });

    commands.operations.getOldParameters(context);
});

test('[commands.operations.getOldParameters] failed to lookup stack', (t) => {
    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        callback(new lookup.CloudFormationError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof lookup.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
            lookup.parameters.restore();
            t.end();
        }
    });

    commands.operations.getOldParameters(context);
});

test('[commands.operations.getOldParameters] success', (t) => {
    sinon.stub(lookup, 'parameters').callsFake(function(name, region, callback) {
        t.equal(name, context.stackName, 'lookup expected stack');
        t.equal(region, context.stackRegion, 'lookup in expected region');
        callback(null, { old: 'parameters' });
    });

    var context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, { old: 'parameters' }, 'set context.oldParameters');
            lookup.parameters.restore();
            t.end();
        }
    });

    commands.operations.getOldParameters(context);
});

test('[commands.operations.promptSaveConfig]', (t) => {
    sinon.stub(prompt, 'input').callsFake((message, def) => {
        t.equal(message, 'Name for saved configuration:', 'expected prompt');
        t.equal(def, context.suffix, 'expected default value');
        return Promise.resolve('chuck');
    });

    var context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        next: function(err) {
            t.ifError(err, 'success');
            t.equal(context.saveName, 'chuck', 'sets context.saveName');
            prompt.input.restore();
            t.end();
        }
    });

    commands.operations.promptSaveConfig(context);
});

test('[commands.operations.confirmSaveConfig] reject', (t) => {
    sinon.stub(prompt, 'confirm').callsFake(() => {
        return Promise.resolve(false);
    });

    var context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        abort: function(err) {
            t.ifError(err, 'aborted');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmSaveConfig(context);
});

test('[commands.operations.confirmSaveConfig] accept', (t) => {
    sinon.stub(prompt, 'confirm').callsFake((message) => {
        t.equal(message, 'Ready to save this configuration as "hello"?', 'expected message');
        return Promise.resolve(true);
    });

    var context = Object.assign({}, basicContext, {
        saveName: 'hello',
        oldParameters: { old: 'parameters' },
        next: function(err) {
            t.ifError(err, 'success');
            prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmSaveConfig(context);
});

test('[commands.operations.saveConfig] bucket not found', (t) => {
    sinon.stub(actions, 'saveConfiguration').callsFake(function(baseName, stackName, stackRegion, bucket, parameters, kms, callback) {
        callback(new actions.BucketNotFoundError('failure'));
    });

    var context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        kms: true,
        abort: function(err) {
            t.ok(err instanceof actions.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find template bucket: failure');
            actions.saveConfiguration.restore();
            t.end();
        }
    });

    commands.operations.saveConfig(context);
});

test('[commands.operations.saveConfig] failure', (t) => {
    sinon.stub(actions, 'saveConfiguration').callsFake(function(baseName, stackName, stackRegion, bucket, parameters, kms, callback) {
        callback(new actions.S3Error('failure'));
    });

    var context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        kms: true,
        abort: function(err) {
            t.ok(err instanceof actions.S3Error, 'expected error type');
            t.equal(err.message, 'Failed to save template: failure');
            actions.saveConfiguration.restore();
            t.end();
        }
    });

    commands.operations.saveConfig(context);
});

test('[commands.operations.saveConfig] success', (t) => {
    sinon.stub(actions, 'saveConfiguration').callsFake(function(baseName, stackName, stackRegion, bucket, parameters, kms, callback) {
        t.equal(baseName, context.baseName, 'save under correct stack name');
        t.equal(stackName, context.stackName, 'save under correct stack name');
        t.equal(stackRegion, context.stackRegion, 'save under correct stack region');
        t.equal(bucket, context.configBucket, 'save in correct bucket');
        t.deepEqual(parameters, { new: 'parameters' }, 'save correct config');
        t.equal(kms, 'alias/cloudformation', 'use appropriate kms setting');
        callback();
    });

    var context = Object.assign({}, basicContext, {
        newParameters: { new: 'parameters' },
        overrides: { kms: true },
        next: function(err) {
            t.ifError(err, 'success');
            actions.saveConfiguration.restore();
            t.end();
        }
    });

    commands.operations.saveConfig(context);
});

test('[commands.operations.mergeMetadata]', (t) => {
    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: { old: 'parameters' },
        overrides: {
            metadata: {
                LastDeploy: 'cooper'
            }
        },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newTemplate.Metadata, { LastDeploy: 'cooper' });
            t.end();
        }
    });
    commands.operations.mergeMetadata(context);
});

test('[commands.operations.mergeMetadata] error', (t) => {
    var context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template', Metadata: { LastDeploy: 'jane' } },
        oldParameters: { old: 'parameters' },
        overrides: {
            metadata: {
                LastDeploy: 'cooper'
            }
        },
        next: function(err) {
            t.equal(err && err.toString(), 'Error: Metadata.LastDeploy already exists in template');
            t.end();
        }
    });
    commands.operations.mergeMetadata(context);
});
