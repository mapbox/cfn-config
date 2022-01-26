const path = require('path');
const test = require('tape');
const sinon = require('sinon');
const cli = require('../lib/cli');
const cfnConfig = require('..');

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

test('[cli.main] no command', (t) => {
    const parsed = Object.assign({}, base, { command: undefined });

    cli.main(parsed, function(err) {
        t.equal(err.message, 'Error: invalid command\n\n' + parsed.help, 'expected error message');
        t.end();
    });
});

test('[cli.main] bad command', (t) => {
    const parsed = Object.assign({}, base, { command: 'hibbity' });

    cli.main(parsed, function(err) {
        t.equal(err.message, 'Error: invalid command\n\n' + parsed.help, 'expected error message');
        t.end();
    });
});

test('[cli.main] no environment', (t) => {
    const parsed = Object.assign({}, base, { environment: undefined });

    cli.main(parsed, function(err) {
        t.equal(err.message, 'Error: missing environment\n\n' + parsed.help, 'expected error message');
        t.end();
    });
});

test('[cli.main] no template path (create)', (t) => {
    const parsed = Object.assign({}, base, { templatePath: undefined });

    cli.main(parsed, function(err) {
        t.equal(err.message, 'Error: missing templatePath\n\n' + parsed.help, 'expected error message');
        t.end();
    });
});

test('[cli.main] no template path (info)', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function() {
        return { info: function() { Array.from(arguments).pop()(); } };
    });

    const parsed = Object.assign({}, base, { command: 'info', templatePath: undefined });

    cli.main(parsed, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});

test('[cli.main] create', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function(options) {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            create: function(suffix, templatePath, overrides, callback) {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.equal(templatePath, base.templatePath, 'provides correct templatePath');
                t.deepEqual(overrides, base.overrides, 'provides correct overrides');
                callback();
            }
        };
    });

    cli.main(base, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});

test('[cli.main] update', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function(options) {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            update: function(suffix, templatePath, overrides, callback) {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.equal(templatePath, base.templatePath, 'provides correct templatePath');
                t.deepEqual(overrides, base.overrides, 'provides correct overrides');
                callback();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'update' });

    cli.main(parsed, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});

test('[cli.main] delete', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function(options) {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            delete: function(suffix, overrides, callback) {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.deepEqual(overrides, base.overrides, 'provides correct overrides');
                callback();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'delete' });

    cli.main(parsed, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});

test('[cli.main] info', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function(options) {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            info: function(suffix, resources, decrypt, callback) {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.deepEqual(resources, base.options.extended, 'provides correct resources boolean');
                t.deepEqual(decrypt, base.options.decrypt, 'provides correct resources boolean');
                callback();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'info' });

    cli.main(parsed, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});

test('[cli.main] save (with kms)', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function(options) {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            save: function(suffix, kms, callback) {
                t.equal(suffix, base.environment, 'provides correct suffix');
                t.deepEqual(kms, base.overrides.kms, 'provides correct kms boolean');
                callback();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'save' });
    parsed.overrides.kms = true;

    cli.main(parsed, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});

test('[cli.main] save (without kms)', (t) => {
    sinon.stub(cfnConfig, 'commands').callsFake(function(options) {
        t.deepEqual(options, base.options, 'provided commands constructor with correct options');
        return {
            save: function(suffix, kms, callback) {
                t.equal(suffix, base.environment, 'provides correct suffix');
                callback();
            }
        };
    });

    const parsed = Object.assign({}, base, { command: 'save' });

    cli.main(parsed, function(err) {
        t.ifError(err, 'success');
        cfnConfig.commands.restore();
        t.end();
    });
});
