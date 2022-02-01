/* eslint-disable no-console */
/* eslint-disable no-useless-escape */
const path = require('path');
const test = require('tape');
const sinon = require('sinon');
const {
    Commands,
    CommandContext,
    Operations
} = require('../lib/commands');
const Prompt = require('../lib/prompt');
const Actions = require('../lib/actions');
const Lookup = require('../lib/lookup');
const Template = require('../lib/template');

const opts = {
    name: 'my-stack',
    region: 'us-east-1',
    configBucket: 'my-config-bucket',
    templateBucket: 'my-template-bucket'
};

test('[commands.create] no overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.create('testing', 'templatePath');

        t.equal(context.operations.length, 13, '13 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.create] with overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.create('testing', 'templatePath', { some: 'overrides' });

        t.equal(context.operations.length, 13, '13 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, { some: 'overrides' }, 'sets context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.create] with template object', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.create('testing', { arbitrary: 'template' });

        t.equal(context.operations.length, 13, '13 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.deepEqual(context.template, { arbitrary: 'template' }, 'set context.template');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] no overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', 'templatePath');

        t.equal(context.operations.length, 15, '15 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, {}, 'sets empty context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] with overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', 'templatePath', { force: true });

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, { force: true }, 'sets context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] with multiple overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', 'templatePath', { force: true, masterConfig: 's3://chill' });

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill' }, 'sets context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] with overrides.skipConfirmParameters', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', 'templatePath', { force: true, masterConfig: 's3://chill', skipConfirmParameters: true });

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill', skipConfirmParameters: true }, 'sets context.overrides');

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] with overrides.skipConfirmTemplate', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', 'templatePath', { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true });

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true }, 'sets context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] with overrides.skipConfirmParameters and overrides.skipConfirmTemplate', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', 'templatePath', { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true, skipConfirmParameters: true });

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.template, 'templatePath', 'set context.template');
        t.deepEqual(context.overrides, { force: true, masterConfig: 's3://chill', skipConfirmTemplate: true, skipConfirmParameters: true }, 'sets context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.update] with template object', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.update('testing', { arbitrary: 'template' });

        t.equal(context.operations.length, 15, '15 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.deepEqual(context.template, { arbitrary: 'template' }, 'set context.template');
        t.deepEqual(context.overrides, {}, 'sets empty context.overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.delete] no overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.delete('testing');

        t.equal(context.operations.length, 3, '3 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.deepEqual(context.overrides, {}, 'sets empty overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.delete] with overrides', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.delete('testing', { force: true });

        t.equal(context.operations.length, 3, '3 operations are run');
        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.deepEqual(context.overrides, { force: true }, 'sets empty overrides');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.info] success w/o resources', async(t) => {
    sinon.stub(Lookup, 'info').callsFake((name, region, resources, decrypt) => {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.notOk(resources, 'lookup.info no resources');
        t.notOk(decrypt, 'lookup.info decrypt=false');

        return Promise.resolve();
    });

    const cmd = new Commands(opts, true);
    try {
        await cmd.info('testing');
    } catch (err) {
        t.error(err);
    }

    Lookup.info.restore();
    t.end();
});

test('[commands.info] success w/ resources', async(t) => {
    sinon.stub(Lookup, 'info').callsFake((name, region, resources, decrypt) => {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.ok(resources, 'lookup.info no resources');
        t.notOk(decrypt, 'lookup.info decrypt=false');

        return Promise.resolve();
    });

    const cmd = new Commands(opts, true);
    try {
        await cmd.info('testing', true);
    } catch (err) {
        t.error(err);
    }

    Lookup.info.restore();
    t.end();
});

test('[commands.info] success w/o decrypt', async(t) => {
    sinon.stub(Lookup, 'info').callsFake((name, region, resources, decrypt) => {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.ok(resources, 'lookup.info resources');
        t.notOk(decrypt, 'lookup.info decrypt=false');

        return Promise.resolve();
    });

    const cmd = new Commands(opts, true);
    try {
        await cmd.info('testing', true);
    } catch (err) {
        t.error(err);
    }

    Lookup.info.restore();
    t.end();
});

test('[commands.info] success w/ decrypt', async(t) => {
    sinon.stub(Lookup, 'info').callsFake((name, region, resources, decrypt) => {
        t.equal(name, 'my-stack-testing', 'lookup.info expected stack name');
        t.equal(region, 'us-east-1', 'lookup.info expected region');
        t.ok(resources, 'lookup.info resources');
        t.ok(decrypt, 'lookup.info decrypt=true');

        return Promise.resolve();
    });

    const cmd = new Commands(opts, true);
    try {
        await cmd.info('testing', true, true);
    } catch (err) {
        t.ifError(err, 'success');
    }

    Lookup.info.restore();
    t.end();
});

test('[commands.info] null provided as suffix', async(t) => {
    sinon.stub(Lookup, 'info').callsFake((name, region, resources, decrypt) => {
        t.equal(name, 'my-stack', 'no trailing - on stack name');
        return Promise.resolve();
    });

    const cmd = new Commands(opts);

    try {
        await cmd.info(null, true);
    } catch (err) {
        t.error(err);
    }

    Lookup.info.restore();
    t.end();
});

test('[commands.save] kms-mode', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.save('testing', true);

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.kms, true, 'sets context.kms');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.save] not kms-mode', async(t) => {
    const cmd = new Commands(opts, true);

    try {
        const context = await cmd.save('testing');

        t.deepEqual(context.config, opts, 'instantiate context with expected config');
        t.deepEqual(context.suffix, 'testing', 'instantiate context with expected suffix');
        t.equal(context.kms, false, 'sets context.kms');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.commandContext] sets context', (t) => {
    const context = new CommandContext(opts, 'testing', opts);
    t.equal(context.baseName, opts.name, 'sets baseName');
    t.equal(context.suffix, 'testing', 'sets suffix');
    t.equal(context.stackName, opts.name + '-testing', 'sets stackName');
    t.equal(context.stackRegion, opts.region, 'sets stackRegion');
    t.equal(context.configBucket, opts.configBucket, 'sets configBucket');
    t.equal(context.templateBucket, opts.templateBucket, 'sets templateBucket');
    t.deepEqual(context.overrides, {}, 'sets empty overrides');
    t.deepEqual(context.oldParameters, {}, 'sets empty oldParameters');
    t.end();
});

test('[commands.commandContext] handles null suffix', (t) => {
    const context = new CommandContext(opts, null, opts);
    t.equal(context.stackName, opts.name, 'sets stackName without trailing -');
    t.end();
});

test('[commands.commandContext] iterates through operations', async(t) => {
    let i = 0;
    const ops = [
        async function(context) {
            t.equal(i, 0, 'called first function');
            i++;
        },
        async function(context) {
            t.equal(i, 1, 'called second function');
            i++;
        }
    ];

    const context = new CommandContext(opts, 'testing', ops);
    try {
        await context.run();
        t.equals(i, 2);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.commandContext] context.diffs', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake(() => {
        return Promise.resolve(true);
    });

    try {
        const ops = [
            Operations.confirmParameters,
            Operations.confirmTemplate
        ];

        const context = new CommandContext(opts, 'testing', ops);

        context.oldParameters = { old: 'parameters' };
        context.newParameters = { old: 'parameters', newones: 'too' };
        context.oldTemplate = { old: 'template' };
        context.newTemplate = { new: 'template' };

        const performed = await context.run();

        t.equals(performed, true);

        t.deepEqual(context.diffs, {
            parameters: ' {\n\u001b[32m+  newones: "too"\u001b[39m\n }\n',
            template: '\x1B[90m {\n\x1B[39m\x1B[31m-"old": "template"\n\x1B[39m\x1B[32m+"new": "template"\n\x1B[39m\x1B[90m }\x1B[39m'
        }, 'callback provides diffs as 3rd arg');
    } catch (err) {
        t.error(err);
    }

    Prompt.confirm.restore();
    t.end();
});

test('[commands.commandContext] aborts', async(t) => {

    try {
        const ops = [
            () => { throw new Error('aborted'); }
        ];

        const context = new CommandContext(opts, 'testing', ops);

        const performed = await context.run();

        t.equal(performed, false, 'the requested command was not performed');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[commands.commandContext] aborts with error', async(t) => {
    try {
        const ops = [
            () => { throw new Error('failure'); }
        ];

        const context = new CommandContext(opts, 'testing', ops);

        await context.run();
        t.fail();
    } catch (err) {
        t.equals(err.message, 'failure');
    }

    t.end();
});

test('[commands.operations.updatePreamble] no template', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        return Promise.resolve();
    });

    try {
        const context = new CommandContext(opts, 'testing', []);

        await Operations.updatePreamble(context);

        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.NotFoundError, 'expected error type');
        t.equal(err.message, 'Could not load template: No template passed', 'expected error message');
    }

    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] templatePath not found', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake((name, region) => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'template').callsFake((name, region) => {
        return Promise.resolve();
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = '/tmp/invalid/path/nonono.template.json',

        await Operations.updatePreamble(context);

        t.fail();

    } catch (err) {
        t.ok(err instanceof Template.NotFoundError, 'expected error type');
        t.equal(err.message, 'Could not load template: /tmp/invalid/path/nonono.template.json does not exist', 'expected error message');
    }

    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] template invalid', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        throw new Template.InvalidTemplateError('failure');
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        return Promise.resolve();
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = 'example.template.json',
        await Operations.updatePreamble(context);

        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.InvalidTemplateError, 'expected error type');
        t.equal(err.message, 'Could not parse template: failure', 'expected error message');
    }

    Template.read.restore();
    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] stack not found for parameters', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        throw new Lookup.StackNotFoundError('failure');
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        return Promise.resolve();
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = 'example.template.json',

        await Operations.updatePreamble(context);

        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error type');
        t.equal(err.message, 'Missing stack: failure', 'expected error message');
    }

    Template.read.restore();
    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] failure getting stack parameters', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        throw new Lookup.CloudFormationError('failure');
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        return Promise.resolve();
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = 'example.template.json',

        await Operations.updatePreamble(context);

        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error type');
        t.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
    }

    Template.read.restore();
    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();

});

test('[commands.operations.updatePreamble] stack not found for template', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        throw new Lookup.StackNotFoundError('failure');
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = 'example.template.json',

        await Operations.updatePreamble(context);

        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error type');
        t.equal(err.message, 'Missing stack: failure', 'expected error message');
    }

    Template.read.restore();
    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] failure getting stack template', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        throw new Lookup.CloudFormationError('failure');
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = 'example.template.json',

        await Operations.updatePreamble(context);

        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error type');
        t.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
    }

    Template.read.restore();
    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] success', async(t) => {
    sinon.stub(Template, 'read').callsFake((template, options) => {
        t.equal(template, path.resolve('example.template.json'), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        return Promise.resolve({ new: 'template' });
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve({ old: 'parameters' });
    });

    sinon.stub(Lookup, 'template').callsFake((name, region) => {
        return Promise.resolve({ old: 'template' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = 'example.template.json',
        context.overrides = { templateOptions: { template: 'options' } },

        await Operations.updatePreamble(context);

        t.deepEqual(context.newTemplate, { new: 'template' }, 'sets context.newTemplate');
        t.deepEqual(context.oldTemplate, { old: 'template' }, 'sets context.oldTemplate');
        t.deepEqual(context.oldParameters, { old: 'parameters' }, 'sets context.oldParameters');
    } catch (err) {
        t.error(err);
    }

    Template.read.restore();
    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.updatePreamble] success with template object', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve({ old: 'parameters' });
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
        return Promise.resolve({ old: 'template' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.template = { arbitrary: 'template' },

        await Operations.updatePreamble(context);

        t.deepEqual(context.newTemplate, { arbitrary: 'template' }, 'sets context.newTemplate');
        t.deepEqual(context.oldTemplate, { old: 'template' }, 'sets context.oldTemplate');
        t.deepEqual(context.oldParameters, { old: 'parameters' }, 'sets context.oldParameters');
    } catch (err) {
        t.error(err);
    }

    Lookup.parameters.restore();
    Lookup.template.restore();
    t.end();
});

test('[commands.operations.getMasterConfig] success', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake(() => {
        return Promise.resolve({ old: 'fresh' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = { masterConfig: 's3://chill.cfn.json' },
        context.oldParameters = { old: 'secure:staleelats' };

        await Operations.getMasterConfig(context);

        t.deepEqual(context.oldParameters, { old: 'secure:staleelats' }, 'sets context.oldParameters');
    } catch (err) {
        t.error(err);
    }

    Lookup.defaultConfiguration.restore();
    t.end();
});

test('[commands.operations.getMasterConfig] no-op', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake(() => {
        return Promise.resolve({ old: 'fresh' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = {},
        context.oldParameters = { old: 'stale' };

        await Operations.getMasterConfig(context);

        t.deepEqual(context.oldParameters, { old: 'stale' }, 'context.oldParameters stays the same');
    } catch (err) {
        t.error(err);
    }

    Lookup.defaultConfiguration.restore();
    t.end();

});

test('[commands.operations.getMasterConfig] failed', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake(() => {
        throw new Error();
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = { masterConfig: 's3://unchill.cfn.json' },
        context.oldParameters = { old: 'stale' };
        await Operations.getMasterConfig(context);

        t.fail();
    } catch (err) {
        t.equals(err instanceof Error);
    }

    Lookup.defaultConfiguration.restore();
    t.end();
});

test('[commands.operations.getMasterConfig] no matching oldParameters does not put masterConfig keys into oldParameters for better looking diff at the end', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake(() => {
        return Promise.resolve({ bingo: 'fresh' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = { masterConfig: 's3://chill.cfn.json' },

        context.oldParameters = { old: 'stale' };
        await Operations.getMasterConfig(context);

        t.deepEqual(context.oldParameters, { old: 'stale' }, 'leaves context.oldParameters alone');
    } catch (err) {
        t.error(err);
    }

    Lookup.defaultConfiguration.restore();
    t.end();
});

test('[commands.operations.getMasterConfig] adding a newParameter that matches masterConfig parameter does not get overwritten, so that user is intentional in adding newParameters', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake(() => {
        return Promise.resolve({ old: 'fresh' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = { masterConfig: 's3://chill.cfn.json' },

        context.oldParameters = { hello: 'goodbye' };
        context.newTemplate = {};
        context.newTemplate.Parameters = { old: 'special whale' };
        commands.operations.getMasterConfig(context);

        t.deepEqual(context.oldParameters, { hello: 'goodbye' }, 'no matching keys between oldParameters and masterConfig, no oldParameters are replaced');
        t.deepEqual(context.newTemplate.Parameters, { old: 'special whale' }, 'newParameters are not replaced despite matching keys');
    } catch (err) {
        t.error(err);
    }

    Lookup.defaultConfiguration.restore();
    t.end();
});

test('[commands.operations.promptParameters] force-mode', async(t) => {
    sinon.stub(Template, 'questions').callsFake(() => {
        t.fail('should not build questions');
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.newTemplate = { Parameters: { old: {}, new: {} } },
        context.oldParameters = { old: 'parameters', extra: 'value' },
        context.overrides = { force: true },

        await Operations.promptParameters(context);

        t.deepEqual(context.newParameters, { old: 'parameters' }, 'sets new parameters to old values, excluding values not present in template');
        t.notOk(context.newParameters.new, 'does not provide a parameter value if no default for it was found');
    } catch (err) {
        t.error(err);
    }

    Template.questions.restore();
    t.end();
});

test('[commands.operations.promptParameters] not force-mode', async(t) => {
    const questions = { parameter: 'questions' };
    const answers = { parameter: 'answers' };

    sinon.stub(Template, 'questions').callsFake((template, overrides) => {
        t.deepEqual(template, { new: 'template' }, 'builds questions for new template');
        t.deepEqual(overrides, { defaults: { old: 'parameters' }, kmsKeyId: undefined, region: 'us-east-1' }, 'uses old parameters as default values');
        return questions;
    });

    sinon.stub(Prompt, 'parameters').callsFake((question) => {
        t.deepEqual(question, questions, 'prompts for derived questions');
        return Promise.resolve(answers);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.newTemplate = { new: 'template' },
        context.oldParameters = { old: 'parameters' },

        Operations.promptParameters(context);

        t.deepEqual(context.newParameters, answers, 'sets new parameters to prompt responses');
    } catch (err) {
        t.error(err);
    }

    Template.questions.restore();
    Prompt.parameters.restore();
    t.end();
});

test('[commands.operations.promptParameters] with parameter and kms overrides', async(t) => {
    sinon.stub(Template, 'questions').callsFake((template, overrides) => {
        t.deepEqual(overrides, { defaults: { old: 'overriden' }, kmsKeyId: 'this is a bomb key', region: 'us-west-2' }, 'uses override parameters');
        return { parameter: 'questions' };
    });

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve({ the: 'answers' });
    });

    const context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: { old: 'parameters' },
        overrides: { parameters: { old: 'overriden' }, kms: 'this is a bomb key' },
        next: function(err) {
            t.ifError(err, 'success');
            template.questions.restore();
            Prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] force-mode with no parameters in new template', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.promptParameters] reject overrides that are not in old or new template', async(t) => {
    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve({ some: 'answers' });
    });

    const context = Object.assign({}, basicContext, {
        newTemplate: { Parameters: { Name: {} } },
        oldParameters: { Name: 'name', Age: 'age' },
        overrides: { parameters: { Name: 'overriden', Born: 'ignored' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.notOk(context.oldParameters.Born, 'excludes extraneous parameter override');
            Prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] changesetParameters use previous value for unchanged parameter values', async(t) => {
    const oldParameters = { old: 'parameters', the: 'answers' };
    const newParameters = { old: 'newvalue', the: 'answers' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    const context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: oldParameters,
        overrides: {},
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'old', ParameterValue: 'newvalue' }, { ParameterKey: 'the', UsePreviousValue: true }]);
            Prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] changesetParameters does not set UsePreviousValue when overrides set the value', async(t) => {
    const oldParameters = { beep: 'boop' };
    const newParameters = { beep: 'boop' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    const context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: oldParameters,
        overrides: { parameters: { beep: 'boop' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', ParameterValue: 'boop' }]);
            Prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] changesetParameters sets UsePreviousValue to true in the absence of overrides', async(t) => {
    const oldParameters = { beep: 'bop' };
    const newParameters = { beep: 'bop' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    const context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        oldParameters: oldParameters,
        overrides: {},
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', UsePreviousValue: true }]);
            Prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.promptParameters] do not set UsePreviousValue when creating a new stack', async(t) => {
    const oldParameters = { beep: 'boop' };
    const newParameters = { beep: 'boop' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    const context = Object.assign({}, basicContext, {
        stackRegion: 'us-west-2',
        newTemplate: { new: 'template' },
        create: true,
        oldParameters: oldParameters,
        overrides: { parameters: { beep: 'boop' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.ok(context.create, 'context.create is set to true');
            t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', ParameterValue: 'boop' }]);
            Prompt.parameters.restore();
            t.end();
        }
    });

    commands.operations.promptParameters(context);
});

test('[commands.operations.confirmParameters] force-mode', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.confirmParameters] no difference', async(t) => {
    const context = Object.assign({}, basicContext, {
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

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
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
            Prompt.confirm.restore();
            t.end();
        }
    }));
});

test('[commands.operations.confirmParameters] accepted', async(t) => {
    t.plan(2);

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameters"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    await commands.operations.confirmParameters(Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        newParameters: { new: 'parameters' },
        overrides: {},
        next: function(err) {
            t.ifError(err, 'success');
            Prompt.confirm.restore();
            t.end();
        },
        abort: function() {
            t.fail('should proceed');
        }
    }));
});

test('[commands.operations.confirmTemplate] no difference', async(t) => {
    const context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { old: 'template' },
        next: function() {
            t.pass('skipped prompting');
            t.end();
        }
    });

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] undefined', async(t) => {
    const context = Object.assign({}, basicContext, {
        oldTemplate: { Parameters: { old: undefined } },
        newTemplate: { Parameters: {} },
        next: function() {
            t.pass('skipped prompting');
            t.end();
        }
    });

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] force-mode', async(t) => {
    const context = Object.assign({}, basicContext, {
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

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] preapproved', async(t) => {
    sinon.stub(console, 'log');

    const context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        overrides: {
            preapproved: {
                template: ['\u001b[90m {\n\u001b[39m\u001b[31m-\"old\": \"template\"\n\u001b[39m\u001b[32m+\"new\": \"template\"\n\u001b[39m\u001b[90m }\u001b[39m']
            }
        },
        next: (err) => {
            t.ok(console.log.calledWith('Auto-confirming template changes... Changes were pre-approved in another region.'), 'Skip notice printed');
            t.ifError(err, 'should proceed');
            t.ok(context.overrides.skipConfirmTemplate, 'sets skipConfirmTemplate');
            console.log.restore();
            t.end();
        },
        abort: (err) => {
            t.ifError(err, 'should not proceed');
        }
    });

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] rejected', async(t) => {
    t.plan(2);

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(
            message,
            '\x1B[90m {\n\x1B[39m\x1B[31m-"old": "template"\n\x1B[39m\x1B[32m+"new": "template"\n\x1B[39m\x1B[90m }\x1B[39m\nAccept template changes?',
            'prompted appropriate message');
        return Promise.resolve(false);
    });

    basicContext.overrides = {}; // some previous test has mutated this

    const context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        next: function() {
            t.fail('should not proceed');
            t.end();
        },
        abort: function(err) {
            t.ifError(err, 'aborted');
            Prompt.confirm.restore();
        }
    });

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] accepted', async(t) => {
    t.plan(2);

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, '\x1B[90m {\n\x1B[39m\x1B[31m-"old": "template"\n\x1B[39m\x1B[32m+"new": "template"\n\x1B[39m\x1B[90m }\x1B[39m\nAccept template changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
        oldTemplate: { old: 'template' },
        newTemplate: { new: 'template' },
        next: function(err) {
            t.ifError(err, 'success');
            Prompt.confirm.restore();
            t.end();
        },
        abort: function() {
            t.fail('should not abort');
        }
    });

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.confirmTemplate] lengthy diff, first unchanged section ignored', async(t) => {
    t.plan(2);

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, '\x1B[90m {\n "a": "lines",\n "aa": "lines",\n\x1B[39m\x1B[31m-"and": "will change too",\n\x1B[39m\x1B[32m+"and": "has changed",\n\x1B[39m\x1B[90m "b": "lines",\n "ba": "lines",\n "c": "lines",\n\x1B[39m\x1B[90m\n---------------------------------------------\n\n\x1B[39m\x1B[90m "r": "lines",\n "s": "lines",\n "t": "lines",\n\x1B[39m\x1B[31m-"this": "will change",\n\x1B[39m\x1B[32m+"this": "has changed",\n\x1B[39m\x1B[90m "u": "lines",\n "v": "lines"\n }\x1B[39m\nAccept template changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
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
            Prompt.confirm.restore();
            t.end();
        },
        abort: function() {
            t.fail('should not abort');
        }
    });

    await commands.operations.confirmTemplate(context);
});

test('[commands.operations.saveTemplate] bucket not found', async(t) => {
    const url = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

    sinon.stub(Actions, 'templateUrl').callsFake(() => {
        return url;
    });

    sinon.stub(Actions, 'saveTemplate').callsFake(() => {
        throw new Actions.BucketNotFoundError('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Actions.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find template bucket: failure', 'expected error message');
            Actions.templateUrl.restore();
            Actions.saveTemplate.restore();
            t.end();
        }
    });

    commands.operations.saveTemplate(context);
});

test('[commands.operations.saveTemplate] failed to save template', async(t) => {
    const url = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

    sinon.stub(Actions, 'templateUrl').callsFake(() => {
        return url;
    });

    sinon.stub(Actions, 'saveTemplate').callsFake(() => {
        throw new Actions.S3Error('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Actions.S3Error, 'expected error type');
            t.equal(err.message, 'Failed to save template: failure', 'expected error message');
            Actions.templateUrl.restore();
            Actions.saveTemplate.restore();
            t.end();
        }
    });

    commands.operations.saveTemplate(context);
});

test('[commands.operations.saveTemplate] success', async(t) => {
    const templateUrl = 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json';

    sinon.stub(Actions, 'templateUrl').callsFake((bucket, region, suffix) => {
        t.equal(bucket, context.templateBucket, 'template url in proper bucket');
        t.equal(region, context.stackRegion, 'template url in proper region');
        t.equal(suffix, context.suffix, 'template url for correct suffix');
        return templateUrl;
    });

    sinon.stub(Actions, 'saveTemplate').callsFake((url, template) => {
        t.equal(url, templateUrl, 'saved to correct url');
        t.equal(template, '{\n  "new": "template"\n}', 'saved correct template');

        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        newTemplate: { new: 'template' },
        next: function(err) {
            t.ifError(err, 'success');
            t.equal(context.templateUrl, templateUrl, 'sets template url');
            Actions.templateUrl.restore();
            Actions.saveTemplate.restore();
            t.end();
        }
    });

    commands.operations.saveTemplate(context);
});

test('[commands.operations.validateTemplate] invalid', async(t) => {
    sinon.stub(Actions, 'validate').callsFake(() => {
        throw new Actions.CloudFormationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
        abort: function(err) {
            t.ok(err instanceof Actions.CloudFormationError, 'correct error type');
            t.equal(err.message, 'Invalid template: failure', 'expected error message');
            Actions.validate.restore();
            t.end();
        }
    });

    commands.operations.validateTemplate(context);
});

test('[commands.operations.validateTemplate] valid', async(t) => {
    t.plan(3);

    sinon.stub(Actions, 'validate').callsFake((region, url) => {
        t.equal(region, context.stackRegion, 'validate in proper region');
        t.equal(url, context.templateUrl, 'validate proper template');
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        templateUrl: 'https://s3.amazonaws.com/my-template-bucket/my-stack-testing.template.json',
        abort: function() {
            t.fail('failed');
        },
        next: function(err) {
            t.ifError(err, 'success');
            Actions.validate.restore();
        }
    });

    commands.operations.validateTemplate(context);
});

test('[commands.operations.beforeUpdateHook] no hook', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.validateParametersHook] no hook', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.validateParametersHook] hook error', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.validateParametersHook] hook success', async(t) => {
    t.plan(2);
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.beforeUpdateHook] hook error', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.beforeUpdateHook] hook success', async(t) => {
    t.plan(2);

    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.getChangeset] failure', async(t) => {
    sinon.stub(Actions, 'diff').callsFake(() => {
        throw new Actions.CloudFormationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Actions.CloudFormationError, 'correct error type');
            t.equal(err.message, 'Failed to generate changeset: failure', 'expected error message');
            Actions.diff.restore();
            t.end();
        },
        next: function() {
            t.fail('should not proceed');
        }
    });

    commands.operations.getChangeset(context);
});

test('[commands.operations.getChangeset] success', async(t) => {
    t.plan(8);

    const details = { changeset: 'details' };

    sinon.stub(Actions, 'diff').callsFake((name, region, changeSetType, url, params, expand) => {
        t.equal(name, context.stackName, 'changeset for correct stack');
        t.equal(region, context.stackRegion, 'changeset in the correct region');
        t.equal(changeSetType, 'UPDATE', 'changeSetType set correctly');
        t.equal(url, context.templateUrl, 'changeset for the correct template');
        t.deepEqual(params, context.changesetParameters, 'changeset using changeset parameters');
        t.equal(expand, context.overrides.expand, 'changeset using override properties');
        return Promise.resolve(details);
    });

    const context = Object.assign({}, basicContext, {
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
            Actions.diff.restore();
            t.end();
        }
    });

    commands.operations.getChangeset(context, 'UPDATE');
});

test('[commands.operations.getChangesetCreate] success', async(t) => {
    t.plan(1);

    sinon.stub(Operations, 'getChangeset').callsFake((context, changeSetType) => {
        t.equals(changeSetType, 'CREATE', 'has changeSetType');
        return Promise.resolve();
    });

    const context = {
        next: function() {
            commands.operations.getChangeset.restore();
            t.end();
        }
    };

    commands.operations.getChangesetCreate(context);
});

test('[commands.operations.getChangesetUpdate] success', async(t) => {
    t.plan(1);

    sinon.stub(Operations, 'getChangeset').callsFake((context, changeSetType) => {
        t.equals(changeSetType, 'UPDATE', 'has changeSetType');
        return Promise.resolve();
    });

    const context = {
        next: function() {
            commands.operations.getChangeset.restore();
            t.end();
        }
    };

    commands.operations.getChangesetUpdate(context);
});

test('[commands.operations.confirmChangeset] force-mode', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.confirmChangeset] skipConfirmParams && skipConfirmTemplate', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.confirmChangeset] rejected', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(defaultValue, false);
        return Promise.resolve(false);
    });

    const context = Object.assign({}, basicContext, {
        changeset: { changes: [] },
        abort: function(err) {
            t.ifError(err, 'aborted');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] acccepted', async(t) => {
    t.plan(3);

    sinon.stub(Prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, '\n\n\nAccept changes and update the stack?', 'expected message');
        t.equal(defaultValue, false);
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
        changeset: { changes: [] },
        abort: function() {
            t.fail('should not abort');
        },
        next: function() {
            t.pass('success');
            Prompt.confirm.restore();
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.confirmChangeset] changeset formatting', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, 'Action  Name  Type  Replace\n------  ----  ----  -------\n\x1b[33mModify\x1b[39m  name  type  \x1b[31mtrue\x1b[39m   \n\x1b[32mAdd\x1b[39m     name  type  \x1b[32mfalse\x1b[39m  \n\x1b[31mRemove\x1b[39m  name  type  \x1b[32mfalse\x1b[39m  \n\nAccept changes and update the stack?', 'expected message (with colors)');
        t.equal(defaultValue, false);
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
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
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmChangeset(context);
});

test('[commands.operations.executeChangeSet] failure', async(t) => {
    sinon.stub(Actions, 'executeChangeSet').callsFake((name, region, id) => {
        throw new Actions.CloudFormationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        changeset: { id: 'changeset:arn' },
        abort: function(err) {
            t.ok(err instanceof Actions.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to execute changeset: failure');
            Actions.executeChangeSet.restore();
            t.end();
        }
    });

    commands.operations.executeChangeSet(context);
});

test('[commands.operations.executeChangeSet] not executable', async(t) => {
    sinon.stub(Actions, 'executeChangeSet').callsFake((name, region, id) => {
        const err = new Actions.ChangeSetNotExecutableError('failure');
        err.execution = 'OBSOLETE';
        err.reason = 'outdated';
        throw err;
    });

    const context = Object.assign({}, basicContext, {
        changeset: { id: 'changeset:arn' },
        abort: function(err) {
            t.ok(err instanceof Actions.ChangeSetNotExecutableError, 'expected error type');
            t.equal(err.message, 'Status: OBSOLETE | Reason: outdated | failure', 'expected error message');
            Actions.executeChangeSet.restore();
            t.end();
        }
    });

    commands.operations.executeChangeSet(context);
});

test('[commands.operations.executeChangeSet] success', async(t) => {
    t.plan(4);

    sinon.stub(Actions, 'executeChangeSet').callsFake((name, region, id) => {
        t.equal(name, context.stackName, 'execute on proper stack');
        t.equal(region, context.stackRegion, 'execute in proper region');
        t.equal(id, context.changeset.id, 'execute proper changeset');

        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        changeset: { id: 'changeset:arn' },
        next: function() {
            t.pass('success');
            Actions.executeChangeSet.restore();
            t.end();
        }
    });

    commands.operations.executeChangeSet(context);
});

test('[commands.operations.createPreamble] no template', async(t) => {
    sinon.stub(Lookup, 'configurations').callsFake(() => {
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: No template passed');
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] template not found', async(t) => {
    sinon.stub(Lookup, 'configurations').callsFake(() => {
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        template: '/tmp/invalid/path/nonono.template.json',
        abort: function(err) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: /tmp/invalid/path/nonono.template.json does not exist', 'expected error message');
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] template invalid', async(t) => {
    sinon.stub(template, 'read').callsFake(() => {
        throw new Template.InvalidTemplateError('failure');
    });

    sinon.stub(Lookup, 'configurations').callsFake(() => {
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof template.InvalidTemplateError, 'expected error type');
            t.equal(err.message, 'Could not parse template: failure');
            template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] config bucket not found', async(t) => {
    sinon.stub(template, 'read').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'configurations').callsFake(() => {
        throw new Lookup.BucketNotFoundError('failure');
    });

    const context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find config bucket: failure');
            template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] failed to read configurations', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'configurations').callsFake(() => {
        throw new Lookup.S3Error('failure');
    });

    const context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof Lookup.S3Error, 'expected error type');
            t.equal(err.message, 'Could not load saved configurations: failure');
            template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] success', async(t) => {
    sinon.stub(Template, 'read').callsFake((template, options) => {
        t.equal(template, path.resolve('example.template.json'), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        return Promise.resolve({ new: 'template' });
    });

    sinon.stub(Lookup, 'configurations').callsFake((name, bucket, region) => {
        t.equal(name, context.baseName, 'lookup correct stack configurations');
        t.equal(bucket, context.configBucket, 'lookup in correct bucket');
        return Promise.resolve(['config']);
    });

    const context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        overrides: { templateOptions: { template: 'options' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newTemplate, { new: 'template' }, 'set context.newTemplate');
            t.deepEqual(context.configNames, ['config'], 'set context.configNames');
            t.ok(context.create, 'context.create is set to true');
            template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.createPreamble] success with template object', async(t) => {
    sinon.stub(Template, 'read').callsFake((template, options) => {
        t.equal(template, path.resolve(context.template), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        return Promise.resolve(context.template);
    });

    sinon.stub(Lookup, 'configurations').callsFake((name, bucket, region) => {
        t.equal(name, context.baseName, 'lookup correct stack configurations');
        t.equal(bucket, context.configBucket, 'lookup in correct bucket');
        return Promise.resolve(['config']);
    });

    const context = Object.assign({}, basicContext, {
        template: { arbitrary: 'template' },
        overrides: { templateOptions: { template: 'options' } },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.newTemplate, context.template, 'set context.newTemplate');
            t.deepEqual(context.configNames, ['config'], 'set context.configNames');
            t.ok(context.create, 'context.create is set to true');
            template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    commands.operations.createPreamble(context);
});

test('[commands.operations.selectConfig] force-mode', async(t) => {
    sinon.stub(Prompt, 'configuration').callsFake(() => {
        t.fail('should not prompt');
        throw new Error('failure');
    });

    const context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'success');
            t.notOk(context.configName, 'does not set context.configName');
            Prompt.configuration.restore();
            t.end();
        }
    });

    commands.operations.selectConfig(context);
});

test('[commands.operations.selectConfig] new config', async(t) => {
    sinon.stub(Prompt, 'configuration').callsFake((configs) => {
        t.deepEqual(configs, context.configNames, 'prompted with correct config names');
        return Promise.resolve('New configuration');
    });

    const context = Object.assign({}, basicContext, {
        configNames: ['config'],
        next: function(err) {
            t.ifError(err, 'success');
            t.notOk(context.configName, 'does not set context.configName');
            Prompt.configuration.restore();
            t.end();
        }
    });

    commands.operations.selectConfig(context);
});

test('[commands.operations.selectConfig] saved config', async(t) => {
    sinon.stub(Prompt, 'configuration').callsFake((configs) => {
        t.deepEqual(configs, context.configNames, 'prompted with correct config names');
        return Promise.resolve('config');
    });

    const context = Object.assign({}, basicContext, {
        configNames: ['config'],
        next: function(err) {
            t.ifError(err, 'success');
            t.equal(context.configName, 'config', 'does set context.configName');
            Prompt.configuration.restore();
            t.end();
        }
    });

    commands.operations.selectConfig(context);
});

test('[commands.operations.loadConfig] no saved config, no default', async(t) => {
    const context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, {}, 'does not set context.oldParameters');
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] no saved config, has default', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake((s3url) => {
        t.equal(s3url, 's3://my-bucket/my-default.cfn.json', 'requested correct configuration');
        return Promise.resolve({ default: 'configuration' });
    });

    const context = Object.assign({}, basicContext, {
        overrides: { defaultConfig: 's3://my-bucket/my-default.cfn.json' },
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, { default: 'configuration' }, 'sets context.oldParameters');
            Lookup.defaultConfiguration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] bucket not found', async(t) => {
    sinon.stub(Lookup, 'configuration').callsFake(() => {
        throw new Lookup.BucketNotFoundError('failure');
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find config bucket: failure', 'expected error message');
            Lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] config not found', async(t) => {
    sinon.stub(Lookup, 'configuration').callsFake(() => {
        throw new Lookup.ConfigurationNotFoundError('failure');
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof Lookup.ConfigurationNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find saved configuration: failure', 'expected error message');
            Lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] invalid config', async(t) => {
    sinon.stub(Lookup, 'configuration').callsFake(() => {
        throw new Lookup.InvalidConfigurationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof Lookup.InvalidConfigurationError, 'expected error type');
            t.equal(err.message, 'Saved configuration error: failure', 'expected error message');
            Lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] failed to load config', async(t) => {
    sinon.stub(Lookup, 'configuration').callsFake(() => {
        throw new Lookup.S3Error('failure');
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ok(err instanceof Lookup.S3Error, 'expected error type');
            t.equal(err.message, 'Failed to read saved configuration: failure', 'expected error message');
            Lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.loadConfig] success', async(t) => {
    sinon.stub(Lookup, 'configuration').callsFake((name, bucket, config) => {
        t.equal(name, context.baseName, 'expected stack name');
        t.equal(bucket, context.configBucket, 'expected config bucket');
        t.equal(config, context.configName, 'expected config name');
        return Promise.resolve({ saved: 'configuration' });
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, { saved: 'configuration' }, 'set context.oldParameters');
            Lookup.configuration.restore();
            t.end();
        }
    });

    commands.operations.loadConfig(context);
});

test('[commands.operations.confirmCreate] force-mode', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake(() => {
        t.fail('should not prompt');
        throw new Error('failure');
    });

    const context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'success');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmCreate] reject', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake(() => {
        return Promise.resolve(false);
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        abort: function(err) {
            t.ifError(err, 'aborted');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmCreate] accept', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, 'Ready to create the stack?', 'expected message');
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
        configName: 'config',
        next: function(err) {
            t.ifError(err, 'success');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmCreate(context);
});

test('[commands.operations.confirmDelete] force-mode', async(t) => {
    const context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'no prompt');
            t.end();
        }
    });

    commands.operations.confirmDelete(context);
});

test('[commands.operations.confirmDelete] reject', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, 'Are you sure you want to delete my-stack-testing in region us-east-1?');
        t.equal(defaultValue, false);
        return Promise.resolve(false);
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ifError(err, 'aborted');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmDelete(context);
});

test('[commands.operations.confirmDelete] accept', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake((message, defaultValue) => {
        t.equal(message, 'Are you sure you want to delete my-stack-testing in region us-east-1?', 'expected message');
        t.equal(defaultValue, false);
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmDelete(context);
});

test('[commands.operations.deleteStack] failure', async(t) => {
    sinon.stub(Actions, 'delete').callsFake(() => {
        throw new Actions.CloudFormationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Actions.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to delete stack: failure', 'expected error message');
            Actions.delete.restore();
            t.end();
        }
    });

    commands.operations.deleteStack(context);
});

test('[commands.operations.deleteStack] success', async(t) => {
    sinon.stub(Actions, 'delete').callsFake((name, region) => {
        t.equal(name, context.stackName, 'deleted expected stack');
        t.equal(region, context.stackRegion, 'deleted in expected region');
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            Actions.delete.restore();
            t.end();
        }
    });

    commands.operations.deleteStack(context);
});

test('[commands.operations.monitorStack] failure', async(t) => {
    sinon.stub(Actions, 'monitor').callsFake(() => {
        throw new Actions.CloudFormationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.equal(err.message, `Monitoring your deploy failed, but the deploy in region ${context.stackRegion} will continue. Check on your stack's status in the CloudFormation console.`);
            Actions.monitor.restore();
            t.end();
        }
    });

    commands.operations.monitorStack(context);
});

test('[commands.operations.monitorStack] success', async(t) => {
    sinon.stub(Actions, 'monitor').callsFake((name, region) => {
        t.equal(name, context.stackName, 'monitor expected stack');
        t.equal(region, context.stackRegion, 'monitor in expected region');
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            Actions.monitor.restore();
            t.end();
        }
    });

    commands.operations.monitorStack(context);
});

test('[commands.operations.getOldParameters] missing stack', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake((name, region) => {
        throw new Lookup.StackNotFoundError('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Lookup.StackNotFoundError, 'expected error type');
            t.equal(err.message, 'Missing stack: failure', 'expected error message');
            Lookup.parameters.restore();
            t.end();
        }
    });

    commands.operations.getOldParameters(context);
});

test('[commands.operations.getOldParameters] failed to lookup stack', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake(() => {
        throw new Lookup.CloudFormationError('failure');
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Lookup.CloudFormationError, 'expected error type');
            t.equal(err.message, 'Failed to find existing stack: failure', 'expected error message');
            Lookup.parameters.restore();
            t.end();
        }
    });

    commands.operations.getOldParameters(context);
});

test('[commands.operations.getOldParameters] success', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake((name, region) => {
        t.equal(name, context.stackName, 'lookup expected stack');
        t.equal(region, context.stackRegion, 'lookup in expected region');
        return Promise.resolve({ old: 'parameters' });
    });

    const context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, { old: 'parameters' }, 'set context.oldParameters');
            Lookup.parameters.restore();
            t.end();
        }
    });

    commands.operations.getOldParameters(context);
});

test('[commands.operations.promptSaveConfig]', async(t) => {
    sinon.stub(Prompt, 'input').callsFake((message, def) => {
        t.equal(message, 'Name for saved configuration:', 'expected prompt');
        t.equal(def, context.suffix, 'expected default value');
        return Promise.resolve('chuck');
    });

    const context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        next: function(err) {
            t.ifError(err, 'success');
            t.equal(context.saveName, 'chuck', 'sets context.saveName');
            Prompt.input.restore();
            t.end();
        }
    });

    commands.operations.promptSaveConfig(context);
});

test('[commands.operations.confirmSaveConfig] reject', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake(() => {
        return Promise.resolve(false);
    });

    const context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        abort: function(err) {
            t.ifError(err, 'aborted');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmSaveConfig(context);
});

test('[commands.operations.confirmSaveConfig] accept', async(t) => {
    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, 'Ready to save this configuration as "hello"?', 'expected message');
        return Promise.resolve(true);
    });

    const context = Object.assign({}, basicContext, {
        saveName: 'hello',
        oldParameters: { old: 'parameters' },
        next: function(err) {
            t.ifError(err, 'success');
            Prompt.confirm.restore();
            t.end();
        }
    });

    commands.operations.confirmSaveConfig(context);
});

test('[commands.operations.saveConfig] bucket not found', async(t) => {
    sinon.stub(Actions, 'saveConfiguration').callsFake(() => {
        throw new Actions.BucketNotFoundError('failure');
    });

    const context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        kms: true,
        abort: function(err) {
            t.ok(err instanceof Actions.BucketNotFoundError, 'expected error type');
            t.equal(err.message, 'Could not find template bucket: failure');
            Actions.saveConfiguration.restore();
            t.end();
        }
    });

    commands.operations.saveConfig(context);
});

test('[commands.operations.saveConfig] failure', async(t) => {
    sinon.stub(Actions, 'saveConfiguration').callsFake(() => {
        throw new Actions.S3Error('failure');
    });

    const context = Object.assign({}, basicContext, {
        oldParameters: { old: 'parameters' },
        kms: true,
        abort: function(err) {
            t.ok(err instanceof Actions.S3Error, 'expected error type');
            t.equal(err.message, 'Failed to save template: failure');
            Actions.saveConfiguration.restore();
            t.end();
        }
    });

    commands.operations.saveConfig(context);
});

test('[commands.operations.saveConfig] success', async(t) => {
    sinon.stub(Actions, 'saveConfiguration').callsFake((baseName, stackName, stackRegion, bucket, parameters, kms) => {
        t.equal(baseName, context.baseName, 'save under correct stack name');
        t.equal(stackName, context.stackName, 'save under correct stack name');
        t.equal(stackRegion, context.stackRegion, 'save under correct stack region');
        t.equal(bucket, context.configBucket, 'save in correct bucket');
        t.deepEqual(parameters, { new: 'parameters' }, 'save correct config');
        t.equal(kms, 'alias/cloudformation', 'use appropriate kms setting');
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        newParameters: { new: 'parameters' },
        overrides: { kms: true },
        next: function(err) {
            t.ifError(err, 'success');
            Actions.saveConfiguration.restore();
            t.end();
        }
    });

    commands.operations.saveConfig(context);
});

test('[commands.operations.mergeMetadata]', async(t) => {
    const context = Object.assign({}, basicContext, {
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

test('[commands.operations.mergeMetadata] error', async(t) => {
    const context = Object.assign({}, basicContext, {
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
