import path from 'path';
import test from 'tape';
import sinon from 'sinon';
import cli from '../lib/cli.js';
import cfnConfig from '../index.js';

test('[cli.parse] aliases and defaults', (t) => {
    const args = ['create', 'testing', 'relative/path', '-c', 'config', '-t', 'template'];
    const parsed = cli.parse(args, {});

    t.equal(parsed.command, 'create', 'contains command');
    t.equal(parsed.environment, 'testing', 'contains environment');
    t.equal(parsed.templatePath, path.resolve('relative/path'), 'contains absolute template path');
    t.deepEqual(parsed.options, {
        d: false,
        decrypt: false,
        e: false,
        extended: false,
        f: false,
        force: false,
        k: false,
        kms: false,
        n: path.basename(process.cwd()),
        name: path.basename(process.cwd()),
        r: 'us-east-1',
        region: 'us-east-1',
        t: 'template',
        templateBucket: 'template',
        c: 'config',
        configBucket: 'config',
        p: undefined,
        parameters: undefined,
        x: false,
        expand: false
    }, 'provided expected options');
    t.deepEqual(parsed.overrides, { force: false, kms: false, parameters: undefined, expand: false }, 'provided expected overrides');
    t.ok(parsed.help, 'provides help text');
    t.end();
});

test('[cli.parse] sets options', (t) => {
    const args = [
        'create', 'testing', 'relative/path',
        '-c', 'config',
        '-t', 'template',
        '-e', '-f', '-d', '-x',
        '-k', 'kms-id',
        '-n', 'my-stack',
        '-r', 'eu-west-1',
        '-p', '{}'
    ];

    const parsed = cli.parse(args, {});

    t.deepEqual(parsed.options, {
        d: true,
        decrypt: true,
        e: true,
        extended: true,
        f: true,
        force: true,
        k: 'kms-id',
        kms: 'kms-id',
        n: 'my-stack',
        name: 'my-stack',
        r: 'eu-west-1',
        region: 'eu-west-1',
        t: 'template',
        templateBucket: 'template',
        c: 'config',
        configBucket: 'config',
        p: {},
        parameters: {},
        x: true,
        expand: true
    }, 'provided expected options');
    t.deepEqual(parsed.overrides, { force: true, kms: 'kms-id', parameters: {}, expand: true }, 'provided expected overrides');

    t.end();
});

test('[cli.parse] handles default template bucket on create & update', (t) => {
    let parsed = cli.parse(['info', 'testing'], {});
    t.notOk(parsed.options.templateBucket, 'not set when not needed');

    parsed = cli.parse(['create', 'testing'], { AWS_ACCOUNT_ID: '123456789012' });
    t.equal(parsed.options.templateBucket, 'cfn-config-templates-123456789012-us-east-1', 'uses default for create');

    parsed = cli.parse(['update', 'testing'], { AWS_ACCOUNT_ID: '123456789012' });
    t.equal(parsed.options.templateBucket, 'cfn-config-templates-123456789012-us-east-1', 'uses default for create');

    t.throws(
        function() { cli.parse(['create', 'testing'], {}); },
        /Provide \$AWS_ACCOUNT_ID as an environment variable to use the default template bucket, or set --template-bucket/,
        'throws error on create without $AWS_ACCOUNT_ID'
    );

    t.throws(
        function() { cli.parse(['update', 'testing'], {}); },
        /Provide \$AWS_ACCOUNT_ID as an environment variable to use the default template bucket, or set --template-bucket/,
        'throws error on update without $AWS_ACCOUNT_ID'
    );

    t.end();
});

const base = {
    command: 'create',
    environment: 'testing',
    templatePath: '/my/template',
    help: 'help text',
    overrides: { force: false },
    options: {
        extended: false,
        force: false,
        kms: false,
        name: 'my-stack',
        region: 'us-east-1',
        templateBucket: 'template',
        configBucket: 'config'
    }
};

test('[cli.main] no command', async(t) => {
    const parsed = Object.assign({}, base, { command: undefined });

    try {
        await cli.main(parsed);
        t.fail();
    } catch (err) {
        t.equal(err.message, 'Error: invalid command\n\n' + parsed.help, 'expected error message');
    }
    t.end();
});

test('[cli.main] bad command', async(t) => {
    const parsed = Object.assign({}, base, { command: 'hibbity' });

    try {
        await cli.main(parsed);
        t.fail();
    } catch (err) {
        t.equal(err.message, 'Error: invalid command\n\n' + parsed.help, 'expected error message');
    }

    t.end();
});

test('[cli.main] no environment', async(t) => {
    const parsed = Object.assign({}, base, { environment: undefined });

    try {
        await cli.main(parsed);
        t.fail();
    } catch (err) {
        t.equal(err.message, 'Error: missing environment\n\n' + parsed.help, 'expected error message');
    }

    t.end();
});

test('[cli.main] no template path (create)', async(t) => {
    const parsed = Object.assign({}, base, { templatePath: undefined });

    try {
        await cli.main(parsed);
        t.fail();
    } catch (err) {
        t.equal(err.message, 'Error: missing templatePath\n\n' + parsed.help, 'expected error message');
    }

    t.end();
});

test('[cli.main] no template path (info)', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake(() => {
        return {
            info: () => {
                return Promise.resolve({});
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'info', templatePath: undefined });

    try {
        await cli.main(parsed);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});

test('[cli.main] create', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake((options) => {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');

        return {
            create: (suffix, templatePath, overrides) => {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.equal(templatePath, base.templatePath, 'provides correct templatePath');
                t.deepEqual(overrides, base.overrides, 'provides correct overrides');
                return Promise.resolve();
            }
        };
    });

    try {
        await cli.main(base);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});

test('[cli.main] update', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake((options) => {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            update: (suffix, templatePath, overrides) => {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.equal(templatePath, base.templatePath, 'provides correct templatePath');
                t.deepEqual(overrides, base.overrides, 'provides correct overrides');
                return Promise.resolve();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'update' });

    try {
        await cli.main(parsed);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});

test('[cli.main] delete', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake((options) => {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            delete: (suffix, overrides) => {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.deepEqual(overrides, base.overrides, 'provides correct overrides');
                return Promise.resolve();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'delete' });

    try {
        await cli.main(parsed);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});

test('[cli.main] info', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake((options) => {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');

        return {
            info: (suffix, resources, decrypt) => {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.deepEqual(resources, base.options.extended, 'provides correct resources boolean');
                t.deepEqual(decrypt, base.options.decrypt, 'provides correct resources boolean');
                return Promise.resolve();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'info' });

    try {
        await cli.main(parsed);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});

test('[cli.main] save (with kms)', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake((options) => {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            save: (suffix, kms) => {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.deepEqual(kms, base.overrides.kms, 'provides correct kms boolean');
                return Promise.resolve();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'save' });
    parsed.overrides.kms = true;

    try {
        await cli.main(parsed);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});

test('[cli.main] save (without kms)', async(t) => {
    sinon.stub(cfnConfig, 'Commands').callsFake((options) => {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            save: (suffix, kms) => {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.equal(kms, true, 'provides correct kms');
                return Promise.resolve();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'save' });

    try {
        await cli.main(parsed);
    } catch (err) {
        t.error(err);
    }

    cfnConfig.Commands.restore();
    t.end();
});
