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
    sinon.stub(Lookup, 'info').callsFake((name) => {
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
        async() => {
            t.equal(i, 0, 'called first function');
            i++;
        },
        async() => {
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

test('[Operations.updatePreamble] no template', async(t) => {
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

test('[Operations.updatePreamble] templatePath not found', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve();
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
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

test('[Operations.updatePreamble] template invalid', async(t) => {
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

test('[Operations.updatePreamble] stack not found for parameters', async(t) => {
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

test('[Operations.updatePreamble] failure getting stack parameters', async(t) => {
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

test('[Operations.updatePreamble] stack not found for template', async(t) => {
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

test('[Operations.updatePreamble] failure getting stack template', async(t) => {
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

test('[Operations.updatePreamble] success', async(t) => {
    sinon.stub(Template, 'read').callsFake((template, options) => {
        t.equal(template, path.resolve('example.template.json'), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        return Promise.resolve({ new: 'template' });
    });

    sinon.stub(Lookup, 'parameters').callsFake(() => {
        return Promise.resolve({ old: 'parameters' });
    });

    sinon.stub(Lookup, 'template').callsFake(() => {
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

test('[Operations.updatePreamble] success with template object', async(t) => {
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

test('[Operations.getMasterConfig] success', async(t) => {
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

test('[Operations.getMasterConfig] no-op', async(t) => {
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

test('[Operations.getMasterConfig] failed', async(t) => {
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

test('[Operations.getMasterConfig] no matching oldParameters does not put masterConfig keys into oldParameters for better looking diff at the end', async(t) => {
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

test('[Operations.getMasterConfig] adding a newParameter that matches masterConfig parameter does not get overwritten, so that user is intentional in adding newParameters', async(t) => {
    sinon.stub(Lookup, 'defaultConfiguration').callsFake(() => {
        return Promise.resolve({ old: 'fresh' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = { masterConfig: 's3://chill.cfn.json' },

        context.oldParameters = { hello: 'goodbye' };
        context.newTemplate = {};
        context.newTemplate.Parameters = { old: 'special whale' };
        Operations.getMasterConfig(context);

        t.deepEqual(context.oldParameters, { hello: 'goodbye' }, 'no matching keys between oldParameters and masterConfig, no oldParameters are replaced');
        t.deepEqual(context.newTemplate.Parameters, { old: 'special whale' }, 'newParameters are not replaced despite matching keys');
    } catch (err) {
        t.error(err);
    }

    Lookup.defaultConfiguration.restore();
    t.end();
});

test('[Operations.promptParameters] force-mode', async(t) => {
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

test('[Operations.promptParameters] not force-mode', async(t) => {
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

        await Operations.promptParameters(context);

        t.deepEqual(context.newParameters, answers, 'sets new parameters to prompt responses');
    } catch (err) {
        t.error(err);
    }

    Template.questions.restore();
    Prompt.parameters.restore();
    t.end();
});

test('[Operations.promptParameters] with parameter and kms overrides', async(t) => {
    sinon.stub(Template, 'questions').callsFake((template, overrides) => {
        t.deepEqual(overrides, { defaults: { old: 'overriden' }, kmsKeyId: 'this is a bomb key', region: 'us-west-2' }, 'uses override parameters');
        return { parameter: 'questions' };
    });

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve({ the: 'answers' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.stackRegion = 'us-west-2',
        context.newTemplate = { new: 'template' },
        context.oldParameters = { old: 'parameters' },
        context.overrides = { parameters: { old: 'overriden' }, kms: 'this is a bomb key' },

        await Operations.promptParameters(context);
    } catch (err) {
        t.error(err);
    }

    Template.questions.restore();
    Prompt.parameters.restore();
    t.end();
});

test('[Operations.promptParameters] force-mode with no parameters in new template', async(t) => {
    try {
        const context = new CommandContext(opts, 'testing', []);
        context.newTemplate = { new: 'template' },
        context.overrides = { force: true },

        await Operations.promptParameters(context);

        t.deepEqual(context.newParameters, {}, 'sets context.newParameters to empty');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[Operations.promptParameters] reject overrides that are not in old or new template', async(t) => {
    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve({ some: 'answers' });
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.newTemplate = { Parameters: { Name: {} } };
        context.oldParameters = { Name: 'name', Age: 'age' };
        context.overrides = { parameters: { Name: 'overriden', Born: 'ignored' } };

        await Operations.promptParameters(context);

        t.notOk(context.oldParameters.Born, 'excludes extraneous parameter override');
    } catch (err) {
        t.error(err);
    }

    Prompt.parameters.restore();
    t.end();
});

test('[Operations.promptParameters] changesetParameters use previous value for unchanged parameter values', async(t) => {
    const oldParameters = { old: 'parameters', the: 'answers' };
    const newParameters = { old: 'newvalue', the: 'answers' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.stackRegion = 'us-west-2',
        context.newTemplate = { new: 'template' },
        context.oldParameters = oldParameters,
        context.overrides = {},

        await Operations.promptParameters(context);

        t.deepEqual(context.changesetParameters, [{ ParameterKey: 'old', ParameterValue: 'newvalue' }, { ParameterKey: 'the', UsePreviousValue: true }]);
    } catch (err) {
        t.error(err);
    }

    Prompt.parameters.restore();
    t.end();
});

test('[Operations.promptParameters] changesetParameters does not set UsePreviousValue when overrides set the value', async(t) => {
    const oldParameters = { beep: 'boop' };
    const newParameters = { beep: 'boop' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.stackRegion = 'us-west-2',
        context.newTemplate = { new: 'template' },
        context.oldParameters = oldParameters,
        context.overrides = { parameters: { beep: 'boop' } },

        await Operations.promptParameters(context);

        t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', ParameterValue: 'boop' }]);
    } catch (err) {
        t.error(err);
    }
    Prompt.parameters.restore();
    t.end();
});

test('[Operations.promptParameters] changesetParameters sets UsePreviousValue to true in the absence of overrides', async(t) => {
    const oldParameters = { beep: 'bop' };
    const newParameters = { beep: 'bop' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.stackRegion = 'us-west-2',
        context.newTemplate = { new: 'template' },
        context.oldParameters = oldParameters,
        context.overrides = {},

        await Operations.promptParameters(context);

        t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', UsePreviousValue: true }]);
    } catch (err) {
        t.error(err);
    }

    Prompt.parameters.restore();
    t.end();
});

test('[Operations.promptParameters] do not set UsePreviousValue when creating a new stack', async(t) => {
    const oldParameters = { beep: 'boop' };
    const newParameters = { beep: 'boop' };

    sinon.stub(Prompt, 'parameters').callsFake(() => {
        return Promise.resolve(newParameters);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.stackRegion = 'us-west-2';
        context.newTemplate = { new: 'template' };
        context.create = true;
        context.oldParameters = oldParameters;
        context.overrides = { parameters: { beep: 'boop' } };

        await Operations.promptParameters(context);

        t.ok(context.create, 'context.create is set to true');
        t.deepEqual(context.changesetParameters, [{ ParameterKey: 'beep', ParameterValue: 'boop' }]);
    } catch (err) {
        t.error(err);
    }

    Prompt.parameters.restore();
    t.end();
});

test('[Operations.confirmParameters] force-mode', async(t) => {
    try {
        const context = new CommandContext(opts, 'testing', []);
        context.overrides = { force: true };
        context.oldParameters = { old: 'parameters' };
        context.newParameters = { old: 'parameters' };

        await Operations.confirmParameters(context);

        t.pass('skipped prompting');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[Operations.confirmParameters] no difference', async(t) => {
    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldParameters = { old: 'parameters' };
        context.newParameters = { old: 'parameters' };

        await Operations.confirmParameters(context);

        t.pass('skipped prompting');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[Operations.confirmParameters] preapproved', async(t) => {
    sinon.stub(console, 'log');

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldParameters = { old: 'parameters' };
        context.newParameters = { old: 'parameters', newones: 'too' };
        context.overrides = {
            preapproved: { parameters: [' {\n\u001b[32m+  newones: "too"\u001b[39m\n }\n'] }
        };

        await Operations.confirmParameters(context);

        t.ok(console.log.calledWith('Auto-confirming parameter changes... Changes were pre-approved in another region.'), 'Skip notice printed');
        t.pass('skipped prompting');
        t.ok(context.overrides.skipConfirmParameters, 'sets skipConfirmParameters');
    } catch (err) {
        t.error(err);
    }

    console.log.restore();
    t.end();
});

test('[Operations.confirmParameters] rejected', async(t) => {
    t.plan(2);

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameterz"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
        return Promise.resolve(false);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldParameters = { old: 'parameters' };
        context.newParameters = { new: 'parameterz' };
        context.overrides = {};

        await Operations.confirmParameters(context);

        t.fail();
    } catch (err) {
        t.equals(err.message, 'aborted'); // new
    }

    Prompt.confirm.restore();
    t.end();
});

test('[Operations.confirmParameters] accepted', async(t) => {
    t.plan(2);

    sinon.stub(Prompt, 'confirm').callsFake((message) => {
        t.equal(message, ' {\n\x1b[31m-  old: "parameters"\x1b[39m\n\x1b[32m+  new: "parameters"\x1b[39m\n }\n\nAccept parameter changes?', 'prompted appropriate message');
        return Promise.resolve(true);
    });

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldParameters = { old: 'parameters' },
        context.newParameters = { new: 'parameters' },
        context.overrides = {},

        await Operations.confirmParameters(context);
    } catch (err) {
        t.error(err);
    }

    Prompt.confirm.restore();
    t.end();
});

test('[Operations.confirmTemplate] no difference', async(t) => {
    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldTemplate = { old: 'template' },
        context.newTemplate = { old: 'template' },

        await Operations.confirmTemplate(context);

        t.pass('skipped prompting');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[Operations.confirmTemplate] undefined', async(t) => {
    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldTemplate = { Parameters: { old: undefined } },
        context.newTemplate = { Parameters: {} },

        await Operations.confirmTemplate(context);

        t.pass('skipped prompting');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[Operations.confirmTemplate] force-mode', async(t) => {
    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldTemplate = { old: 'template' },
        context.newTemplate = { new: 'template' },
        context.overrides = { force: true },

        await Operations.confirmTemplate(context);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[Operations.confirmTemplate] preapproved', async(t) => {
    sinon.stub(console, 'log');

    try {
        const context = new CommandContext(opts, 'testing', []);
        context.oldTemplate = { old: 'template' },
        context.newTemplate = { new: 'template' },
        context.overrides = {
            preapproved: {
                template: ['\u001b[90m {\n\u001b[39m\u001b[31m-\"old\": \"template\"\n\u001b[39m\u001b[32m+\"new\": \"template\"\n\u001b[39m\u001b[90m }\u001b[39m']
            }
        }

        await Operations.confirmTemplate(context);

        t.ok(console.log.calledWith('Auto-confirming template changes... Changes were pre-approved in another region.'), 'Skip notice printed');
        t.ok(context.overrides.skipConfirmTemplate, 'sets skipConfirmTemplate');
    } catch (err) {
        t.error(err);
    }

    console.log.restore();
    t.end();
});

test('[Operations.confirmTemplate] rejected', async(t) => {
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

    await Operations.confirmTemplate(context);
});

test('[Operations.confirmTemplate] accepted', async(t) => {
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

    await Operations.confirmTemplate(context);
});

test('[Operations.confirmTemplate] lengthy diff, first unchanged section ignored', async(t) => {
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

    await Operations.confirmTemplate(context);
});

test('[Operations.saveTemplate] bucket not found', async(t) => {
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

    await Operations.saveTemplate(context);
});

test('[Operations.saveTemplate] failed to save template', async(t) => {
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

    await Operations.saveTemplate(context);
});

test('[Operations.saveTemplate] success', async(t) => {
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

    await Operations.saveTemplate(context);
});

test('[Operations.validateTemplate] invalid', async(t) => {
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

    await Operations.validateTemplate(context);
});

test('[Operations.validateTemplate] valid', async(t) => {
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

    await Operations.validateTemplate(context);
});

test('[Operations.beforeUpdateHook] no hook', async(t) => {
    const context = Object.assign({}, basicContext, {
        abort: function() {
            t.fail('failed');
        },
        next: function(err) {
            t.ifError(err, 'success');
            t.end();
        }
    });

    await Operations.beforeUpdateHook(context);
});

test('[Operations.validateParametersHook] no hook', async(t) => {
    const context = Object.assign({}, basicContext, {
        abort: function() {
            t.fail('failed');
        },
        next: function(err) {
            t.ifError(err, 'success');
            t.end();
        }
    });

    await Operations.validateParametersHook(context);
});

test('[Operations.validateParametersHook] hook error', async(t) => {
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

    await Operations.validateParametersHook(context);
});

test('[Operations.validateParametersHook] hook success', async(t) => {
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

    await Operations.validateParametersHook(context);
});

test('[Operations.beforeUpdateHook] hook error', async(t) => {
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

    await Operations.beforeUpdateHook(context);
});

test('[Operations.beforeUpdateHook] hook success', async(t) => {
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

    await Operations.beforeUpdateHook(context);
});

test('[Operations.getChangeset] failure', async(t) => {
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

    await Operations.getChangeset(context);
});

test('[Operations.getChangeset] success', async(t) => {
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

    await Operations.getChangeset(context, 'UPDATE');
});

test('[Operations.getChangesetCreate] success', async(t) => {
    t.plan(1);

    sinon.stub(Operations, 'getChangeset').callsFake((context, changeSetType) => {
        t.equals(changeSetType, 'CREATE', 'has changeSetType');
        return Promise.resolve();
    });

    const context = {
        next: function() {
            Operations.getChangeset.restore();
            t.end();
        }
    };

    await Operations.getChangesetCreate(context);
});

test('[Operations.getChangesetUpdate] success', async(t) => {
    t.plan(1);

    sinon.stub(Operations, 'getChangeset').callsFake((context, changeSetType) => {
        t.equals(changeSetType, 'UPDATE', 'has changeSetType');
        return Promise.resolve();
    });

    const context = {
        next: function() {
            Operations.getChangeset.restore();
            t.end();
        }
    };

    await Operations.getChangesetUpdate(context);
});

test('[Operations.confirmChangeset] force-mode', async(t) => {
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

    await Operations.confirmChangeset(context);
});

test('[Operations.confirmChangeset] skipConfirmParams && skipConfirmTemplate', async(t) => {
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

    await Operations.confirmChangeset(context);
});

test('[Operations.confirmChangeset] rejected', async(t) => {
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

    await Operations.confirmChangeset(context);
});

test('[Operations.confirmChangeset] acccepted', async(t) => {
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

    await Operations.confirmChangeset(context);
});

test('[Operations.confirmChangeset] changeset formatting', async(t) => {
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

    await Operations.confirmChangeset(context);
});

test('[Operations.executeChangeSet] failure', async(t) => {
    sinon.stub(Actions, 'executeChangeSet').callsFake(() => {
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

    await Operations.executeChangeSet(context);
});

test('[Operations.executeChangeSet] not executable', async(t) => {
    sinon.stub(Actions, 'executeChangeSet').callsFake(() => {
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

    await Operations.executeChangeSet(context);
});

test('[Operations.executeChangeSet] success', async(t) => {
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

    await Operations.executeChangeSet(context);
});

test('[Operations.createPreamble] no template', async(t) => {
    sinon.stub(Lookup, 'configurations').callsFake(() => {
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        abort: function(err) {
            t.ok(err instanceof Template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: No template passed');
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.createPreamble] template not found', async(t) => {
    sinon.stub(Lookup, 'configurations').callsFake(() => {
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        template: '/tmp/invalid/path/nonono.template.json',
        abort: function(err) {
            t.ok(err instanceof Template.NotFoundError, 'expected error type');
            t.equal(err.message, 'Could not load template: /tmp/invalid/path/nonono.template.json does not exist', 'expected error message');
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.createPreamble] template invalid', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
        throw new Template.InvalidTemplateError('failure');
    });

    sinon.stub(Lookup, 'configurations').callsFake(() => {
        return Promise.resolve();
    });

    const context = Object.assign({}, basicContext, {
        template: 'example.template.json',
        abort: function(err) {
            t.ok(err instanceof Template.InvalidTemplateError, 'expected error type');
            t.equal(err.message, 'Could not parse template: failure');
            Template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.createPreamble] config bucket not found', async(t) => {
    sinon.stub(Template, 'read').callsFake(() => {
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
            Template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.createPreamble] failed to read configurations', async(t) => {
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
            Template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.createPreamble] success', async(t) => {
    sinon.stub(Template, 'read').callsFake((template, options) => {
        t.equal(template, path.resolve('example.template.json'), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        return Promise.resolve({ new: 'template' });
    });

    sinon.stub(Lookup, 'configurations').callsFake((name, bucket) => {
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
            Template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.createPreamble] success with template object', async(t) => {
    sinon.stub(Template, 'read').callsFake((template, options) => {
        t.equal(template, path.resolve(context.template), 'read correct template path');
        t.deepEqual(options, { template: 'options' }, 'passed overrides.templateOptions');
        return Promise.resolve(context.template);
    });

    sinon.stub(Lookup, 'configurations').callsFake((name, bucket) => {
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
            Template.read.restore();
            Lookup.configurations.restore();
            t.end();
        }
    });

    await Operations.createPreamble(context);
});

test('[Operations.selectConfig] force-mode', async(t) => {
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

    await Operations.selectConfig(context);
});

test('[Operations.selectConfig] new config', async(t) => {
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

    await Operations.selectConfig(context);
});

test('[Operations.selectConfig] saved config', async(t) => {
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

    await Operations.selectConfig(context);
});

test('[Operations.loadConfig] no saved config, no default', async(t) => {
    const context = Object.assign({}, basicContext, {
        next: function(err) {
            t.ifError(err, 'success');
            t.deepEqual(context.oldParameters, {}, 'does not set context.oldParameters');
            t.end();
        }
    });

    await Operations.loadConfig(context);
});

test('[Operations.loadConfig] no saved config, has default', async(t) => {
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

    await Operations.loadConfig(context);
});

test('[Operations.loadConfig] bucket not found', async(t) => {
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

    await Operations.loadConfig(context);
});

test('[Operations.loadConfig] config not found', async(t) => {
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

    await Operations.loadConfig(context);
});

test('[Operations.loadConfig] invalid config', async(t) => {
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

    await Operations.loadConfig(context);
});

test('[Operations.loadConfig] failed to load config', async(t) => {
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

    await Operations.loadConfig(context);
});

test('[Operations.loadConfig] success', async(t) => {
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

    await Operations.loadConfig(context);
});

test('[Operations.confirmCreate] force-mode', async(t) => {
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

    await Operations.confirmCreate(context);
});

test('[Operations.confirmCreate] reject', async(t) => {
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

    await Operations.confirmCreate(context);
});

test('[Operations.confirmCreate] accept', async(t) => {
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

    await Operations.confirmCreate(context);
});

test('[Operations.confirmDelete] force-mode', async(t) => {
    const context = Object.assign({}, basicContext, {
        overrides: { force: true },
        next: function(err) {
            t.ifError(err, 'no prompt');
            t.end();
        }
    });

    await Operations.confirmDelete(context);
});

test('[Operations.confirmDelete] reject', async(t) => {
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

    await Operations.confirmDelete(context);
});

test('[Operations.confirmDelete] accept', async(t) => {
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

    await Operations.confirmDelete(context);
});

test('[Operations.deleteStack] failure', async(t) => {
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

    await Operations.deleteStack(context);
});

test('[Operations.deleteStack] success', async(t) => {
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

    await Operations.deleteStack(context);
});

test('[Operations.monitorStack] failure', async(t) => {
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

    await Operations.monitorStack(context);
});

test('[Operations.monitorStack] success', async(t) => {
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

    await Operations.monitorStack(context);
});

test('[Operations.getOldParameters] missing stack', async(t) => {
    sinon.stub(Lookup, 'parameters').callsFake(() => {
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

    await Operations.getOldParameters(context);
});

test('[Operations.getOldParameters] failed to lookup stack', async(t) => {
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

    await Operations.getOldParameters(context);
});

test('[Operations.getOldParameters] success', async(t) => {
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

    await Operations.getOldParameters(context);
});

test('[Operations.promptSaveConfig]', async(t) => {
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

    await Operations.promptSaveConfig(context);
});

test('[Operations.confirmSaveConfig] reject', async(t) => {
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

    await Operations.confirmSaveConfig(context);
});

test('[Operations.confirmSaveConfig] accept', async(t) => {
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

    await Operations.confirmSaveConfig(context);
});

test('[Operations.saveConfig] bucket not found', async(t) => {
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

    await Operations.saveConfig(context);
});

test('[Operations.saveConfig] failure', async(t) => {
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

    await Operations.saveConfig(context);
});

test('[Operations.saveConfig] success', async(t) => {
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

    await Operations.saveConfig(context);
});

test('[Operations.mergeMetadata]', async(t) => {
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
    await Operations.mergeMetadata(context);
});

test('[Operations.mergeMetadata] error', async(t) => {
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
    await Operations.mergeMetadata(context);
});
