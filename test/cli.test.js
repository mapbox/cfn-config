var path = require('path');
var test = require('tape');
var sinon = require('sinon');
var cli = require('../lib/cli');
var cfnConfig = require('..');

test('[cli.parse] aliases and defaults', function(assert) {
  var args = ['create', 'testing', 'relative/path', '-c', 'config', '-t', 'template'];
  var parsed = cli.parse(args, {});

  assert.equal(parsed.command, 'create', 'contains command');
  assert.equal(parsed.environment, 'testing', 'contains environment');
  assert.equal(parsed.templatePath, path.resolve('relative/path'), 'contains absolute template path');
  assert.deepEqual(parsed.options, {
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
    configBucket: 'config'
  }, 'provided expected options');
  assert.deepEqual(parsed.overrides, { force: false, kms: false }, 'provided expected overrides');
  assert.ok(parsed.help, 'provides help text');
  assert.end();
});

test('[cli.parse] sets options', function(assert) {
  var args = [
    'create', 'testing', 'relative/path',
    '-c', 'config',
    '-t', 'template',
    '-e', '-f',
    '-k', 'kms-id',
    '-n', 'my-stack',
    '-r', 'eu-west-1'
  ];

  var parsed = cli.parse(args, {});

  assert.deepEqual(parsed.options, {
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
    configBucket: 'config'
  }, 'provided expected options');
  assert.deepEqual(parsed.overrides, { force: true, kms: 'kms-id' }, 'provided expected overrides');

  assert.end();
});

test('[cli.parse] handles default template bucket on create & update', function(assert) {
  var parsed = cli.parse(['info', 'testing'], {});
  assert.notOk(parsed.options.templateBucket, 'not set when not needed');

  parsed = cli.parse(['create', 'testing'], { AWS_ACCOUNT_ID: '123456789012' });
  assert.equal(parsed.options.templateBucket, 'cfn-config-templates-123456789012-us-east-1', 'uses default for create');

  parsed = cli.parse(['update', 'testing'], { AWS_ACCOUNT_ID: '123456789012' });
  assert.equal(parsed.options.templateBucket, 'cfn-config-templates-123456789012-us-east-1', 'uses default for create');

  assert.throws(
    function() { cli.parse(['create', 'testing'], {}); },
    /Provide \$AWS_ACCOUNT_ID as an environment variable to use the default template bucket, or set --template-bucket/,
    'throws error on create without $AWS_ACCOUNT_ID'
  );

  assert.throws(
    function() { cli.parse(['update', 'testing'], {}); },
    /Provide \$AWS_ACCOUNT_ID as an environment variable to use the default template bucket, or set --template-bucket/,
    'throws error on update without $AWS_ACCOUNT_ID'
  );

  assert.end();
});

var base = {
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

test('[cli.main] no command', function(assert) {
  var parsed = Object.assign({}, base, { command: undefined });

  cli.main(parsed, function(err) {
    assert.equal(err.message, 'Error: invalid command\n\n' + parsed.help, 'expected error message');
    assert.end();
  });
});

test('[cli.main] bad command', function(assert) {
  var parsed = Object.assign({}, base, { command: 'hibbity' });

  cli.main(parsed, function(err) {
    assert.equal(err.message, 'Error: invalid command\n\n' + parsed.help, 'expected error message');
    assert.end();
  });
});

test('[cli.main] no environment', function(assert) {
  var parsed = Object.assign({}, base, { environment: undefined });

  cli.main(parsed, function(err) {
    assert.equal(err.message, 'Error: missing environment\n\n' + parsed.help, 'expected error message');
    assert.end();
  });
});

test('[cli.main] no template path (create)', function(assert) {
  var parsed = Object.assign({}, base, { templatePath: undefined });

  cli.main(parsed, function(err) {
    assert.equal(err.message, 'Error: missing templatePath\n\n' + parsed.help, 'expected error message');
    assert.end();
  });
});

test('[cli.main] no template path (info)', function(assert) {
  sinon.stub(cfnConfig, 'commands', function() {
    return { info: function() { Array.from(arguments).pop()(); } };
  });

  var parsed = Object.assign({}, base, { command: 'info', templatePath: undefined });

  cli.main(parsed, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});

test('[cli.main] create', function(assert) {
  sinon.stub(cfnConfig, 'commands', function(options) {
    assert.deepEqual(options, base.options, 'provided commands constructor with correct options');
    return {
      create: function(suffix, templatePath, overrides, callback) {
        assert.equal(suffix, base.environment, 'provides correct suffix');
        assert.equal(templatePath, base.templatePath, 'provides correct templatePath');
        assert.deepEqual(overrides, base.overrides, 'provides correct overrides');
        callback();
      }
    };
  });

  cli.main(base, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});

test('[cli.main] update', function(assert) {
  sinon.stub(cfnConfig, 'commands', function(options) {
    assert.deepEqual(options, base.options, 'provided commands constructor with correct options');
    return {
      update: function(suffix, templatePath, overrides, callback) {
        assert.equal(suffix, base.environment, 'provides correct suffix');
        assert.equal(templatePath, base.templatePath, 'provides correct templatePath');
        assert.deepEqual(overrides, base.overrides, 'provides correct overrides');
        callback();
      }
    };
  });

  var parsed = Object.assign({}, base, { command: 'update' });

  cli.main(parsed, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});

test('[cli.main] delete', function(assert) {
  sinon.stub(cfnConfig, 'commands', function(options) {
    assert.deepEqual(options, base.options, 'provided commands constructor with correct options');
    return {
      delete: function(suffix, overrides, callback) {
        assert.equal(suffix, base.environment, 'provides correct suffix');
        assert.deepEqual(overrides, base.overrides, 'provides correct overrides');
        callback();
      }
    };
  });

  var parsed = Object.assign({}, base, { command: 'delete' });

  cli.main(parsed, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});

test('[cli.main] info', function(assert) {
  sinon.stub(cfnConfig, 'commands', function(options) {
    assert.deepEqual(options, base.options, 'provided commands constructor with correct options');
    return {
      info: function(suffix, resources, callback) {
        assert.equal(suffix, base.environment, 'provides correct suffix');
        assert.deepEqual(resources, base.options.extended, 'provides correct resources boolean');
        callback();
      }
    };
  });

  var parsed = Object.assign({}, base, { command: 'info' });

  cli.main(parsed, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});

test('[cli.main] save (with kms)', function(assert) {
  sinon.stub(cfnConfig, 'commands', function(options) {
    assert.deepEqual(options, base.options, 'provided commands constructor with correct options');
    return {
      save: function(suffix, kms, callback) {
        assert.equal(suffix, base.environment, 'provides correct suffix');
        assert.deepEqual(kms, base.overrides.kms, 'provides correct kms boolean');
        callback();
      }
    };
  });

  var parsed = Object.assign({}, base, { command: 'save' });
  parsed.overrides.kms = true;

  cli.main(parsed, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});

test('[cli.main] save (without kms)', function(assert) {
  sinon.stub(cfnConfig, 'commands', function(options) {
    assert.deepEqual(options, base.options, 'provided commands constructor with correct options');
    return {
      save: function(suffix, kms, callback) {
        assert.equal(suffix, base.environment, 'provides correct suffix');
        callback();
      }
    };
  });

  var parsed = Object.assign({}, base, { command: 'save' });


  cli.main(parsed, function(err) {
    assert.ifError(err, 'success');
    cfnConfig.commands.restore();
    assert.end();
  });
});
