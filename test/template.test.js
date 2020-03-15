var test = require('tape');
var queue = require('d3-queue').queue;
var template = require('../lib/template');
var path = require('path');
var fs = require('fs');
var AWS = require('@mapbox/mock-aws-sdk-js');

var expected = require('./fixtures/template.json');

process.env.AWS_ACCESS_KEY_ID = '-';
process.env.AWS_SECRET_ACCESS_KEY = '-';

test('[template.read] local file does not exist', function(assert) {
  template.read('./fake', function(err) {
    assert.ok(err instanceof template.NotFoundError, 'returned expected error');
    assert.end();
  });
});

test('[template.read] local file cannot be parsed', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'malformed-template.json'), function(err) {
    assert.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
    assert.ok(/Failed to parse .*: Unexpected end/.test(err.message), 'passthrough parse error');
    assert.end();
  });
});

test('[template.read] local js file cannot be parsed', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'malformed-template.js'), function(err) {
    assert.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
    assert.ok(/Failed to parse .*/.test(err.message), 'passthrough parse error');
    assert.end();
  });
});

test('[template.read] S3 no access', function(assert) {
  template.read('s3://mapbox/fake', function(err) {
    assert.ok(err instanceof template.NotFoundError, 'returned expected error');
    assert.end();
  });
});

test('[template.read] S3 bucket does not exist', function(assert) {
  assert.plan(2);

  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    var error = new Error('Bucket does not exist');
    error.code = 'NotFoundError';
    callback(error);
  });

  template.read('s3://my/template', function(err) {
    assert.ok(err instanceof template.NotFoundError, 'returned expected error');
    AWS.S3.restore();
  });
});

test('[template.read] S3 file does not exist', function(assert) {
  assert.plan(3);

  AWS.stub('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
    var error = new Error('Object does not exist');
    error.code = 'NotFoundError';
    callback(error);
  });

  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    callback(null, { LocationConstraint: 'eu-central-1' });
  });

  template.read('s3://my/template', function(err) {
    assert.ok(err instanceof template.NotFoundError, 'returned expected error');
    AWS.S3.restore();
  });
});

test('[template.read] S3 file cannot be parsed', function(assert) {
  assert.plan(3);

  AWS.stub('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
    var malformed = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'malformed-template.json'));
    callback(null, { Body: malformed });
  });

  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    callback(null, { LocationConstraint: 'eu-central-1' });
  });

  template.read('s3://my/template', function(err) {
    assert.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
    AWS.S3.restore();
  });
});

test('[template.read] local JSON', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'template.json'), function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, expected, 'got template JSON');
    assert.end();
  });
});

test('[template.read] local sync JS', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'template-sync.js'), function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, expected, 'got template JSON');
    assert.end();
  });
});

test('[template.read] local sync JS (relative path)', function(assert) {
  var relativePath = path.resolve(__dirname, 'fixtures', 'template-sync.js').replace(process.cwd(), '').substr(1);
  assert.equal(relativePath[0] !== '/', true, 'relative path: ' + relativePath);
  template.read(relativePath, function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, expected, 'got template JSON');
    assert.end();
  });
});

test('[template.read] local async JS with options', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'), { some: 'options' }, function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, { some: 'options' }, 'got template JSON');
    assert.end();
  });
});

test('[template.read] local async JS without options', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'), function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, {}, 'got template JSON');
    assert.end();
  });
});

test('[template.read] S3 JSON', function(assert) {
  assert.plan(4);

  AWS.stub('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
    callback(null, { Body: new Buffer(JSON.stringify(expected)) });
  });

  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    callback(null, { LocationConstraint: '' });
  });

  template.read('s3://my/template', function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, expected, 'got template JSON');
    AWS.S3.restore();
  });
});

test('[template.questions] provides expected questions without encryption', function(assert) {
  var questions = template.questions(expected);

  assert.equal(questions.length, 6, 'all questions provided');

  var q = queue(1);

  q.defer(function(next) {
    var name = questions[0];
    assert.equal(name.type, 'input', 'correct type for Name');
    assert.equal(name.name, 'Name', 'correct name for Name');
    assert.equal(name.message, 'Name. Someone\'s first name:', 'correct message for Name');
    assert.ok(name.validate('Ham'), 'valid success for Name');
    assert.notOk(name.validate('ham'), 'invalid success for Name');
    assert.notOk(name.validate('H4m'), 'invalid success for Name');
    next();
  });

  q.defer(function(next) {
    var age = questions[1];
    assert.equal(age.type, 'input', 'correct type for Age');
    assert.equal(age.name, 'Age', 'correct name for Age');
    assert.equal(age.message, 'Age:', 'correct message for Age');
    assert.ok(age.validate('30'), 'valid success for Age');
    assert.notOk(age.validate('ham'), 'invalid success for Age');
    assert.notOk(age.validate('180'), 'invalid success for Age');
    assert.notOk(age.validate('-180'), 'invalid success for Age');
    next();
  });

  q.defer(function(next) {
    var handedness = questions[2];
    assert.equal(handedness.type, 'list', 'correct type for Handedness');
    assert.equal(handedness.name, 'Handedness', 'correct name for Handedness');
    assert.equal(handedness.message, 'Handedness. Their dominant hand:', 'correct message for Handedness');
    assert.equal(handedness.default, 'right', 'correct default value for Handedness');
    assert.deepEqual(handedness.choices, ['left', 'right'], 'correct choices for Handedness');
    next();
  });

  q.defer(function(next) {
    var pets = questions[3];
    assert.equal(pets.type, 'input', 'correct type for Pets');
    assert.equal(pets.name, 'Pets', 'correct name for Pets');
    assert.equal(pets.message, 'Pets. The names of their pets:', 'correct message for Pets');
    next();
  });

  q.defer(function(next) {
    var numbers = questions[4];
    assert.equal(numbers.type, 'input', 'correct type for LuckyNumbers');
    assert.equal(numbers.name, 'LuckyNumbers', 'correct name for LuckyNumbers');
    assert.equal(numbers.message, 'LuckyNumbers. Their lucky numbers:', 'correct message for LuckyNumbers');
    assert.ok(numbers.validate('30,40'), 'valid success for LuckyNumbers');
    assert.notOk(numbers.validate('ham,40'), 'invalid success for LuckyNumbers');
    next();
  });

  q.defer(function(next) {
    var password = questions[5];
    assert.equal(password.type, 'password', 'correct type for SecretPassword');
    assert.equal(password.name, 'SecretPassword', 'correct name for SecretPassword');
    assert.equal(password.message, 'SecretPassword. [secure] Their secret password:', 'correct message for SecretPassword');
    assert.ok(password.validate('hibbities'), 'valid success for SecretPassword');
    assert.notOk(password.validate('ham'), 'invalid success for SecretPassword');
    assert.notOk(password.validate('hamhamhamhamhamhamhamhamham'), 'invalid success for SecretPassword');
    password.async = function() {
      return function(err, unencrypted) {
        assert.equal(unencrypted, 'hibbities', 'passes through secret when kms is falsy');
        next();
      };
    };
    password.filter('hibbities');
  });

  q.awaitAll(function(err) {
    assert.end(err);
  });
});

test('[template.questions] respects overrides', function(assert) {
  AWS.stub('KMS', 'encrypt', function(params, callback) {
    assert.equal(params.KeyId, 'this is a bomb key', 'used custom keyId');
    assert.ok(params.Plaintext);
    return callback(null, { CiphertextBlob: new Buffer(params.Plaintext) });
  });

  var overrides = {
    defaults: { Name: 'Chuck' },
    messages: { Name: 'Somebody' },
    choices: { Handedness: ['top', 'bottom'] },
    kmsKeyId: 'this is a bomb key'
  };

  var questions = template.questions(expected, overrides);

  var q = queue(1);

  q.defer(function(next) {
    var name = questions[0];
    assert.equal(name.default, 'Chuck', 'overriden default for Name');
    assert.equal(name.message, 'Somebody', 'overriden message for Name');
    name.async = function() {
      return function(err, encrypted) {
        assert.ok(encrypted, 'filter success for Name');
        assert.equal(encrypted, 'Ham', 'passes through non-secret parameters');
        next();
      };
    };
    name.filter('Ham');
  });

  q.defer(function(next) {
    var handedness = questions[2];
    assert.deepEqual(handedness.choices, ['top', 'bottom'], 'overriden choices for Handedness');
    next();
  });


  q.defer(function(next) {
    var password = questions[5];
    password.async = function() {
      return function(err, encrypted) {
        assert.ifError(err, 'encryption doesn\'t cause errors');
        assert.equal(encrypted.slice(0, 7), 'secure:', 'encrypted var starts with secure:');
        assert.equal((new Buffer(encrypted.slice(7), 'base64')).toString('utf8'), 'hibbities', 'decrypts correctly');
        next();
      };
    };
    password.filter('hibbities');
  });

  q.defer(function(next) {
    var password = questions[5];
    password.async = function() {
      return function(err, encrypted) {
        assert.ifError(err, 'encryption doesn\'t cause errors');
        assert.equal(encrypted, 'secure:neverchange', 'passes over secure vars');
        next();
      };
    };
    password.filter('secure:neverchange');
  });

  q.awaitAll(function(err) {
    AWS.KMS.restore();
    assert.end(err);
  });
});

test('[template.questions] defaults kms key to correct default', function(assert) {
  AWS.stub('KMS', 'encrypt', function(params, callback) {
    assert.equal(params.KeyId, 'alias/cloudformation', 'used default keyId');
    assert.ok(params.Plaintext);
    return callback(null, { CiphertextBlob: new Buffer(params.Plaintext) });
  });

  var questions = template.questions(expected, { kmsKeyId: true });

  var password = questions[5];
  password.async = function() {
    return function(err, encrypted) {
      assert.ifError(err, 'encryption doesn\'t cause errors');
      assert.equal(encrypted.slice(0, 7), 'secure:', 'encrypted var starts with secure:');
      assert.equal((new Buffer(encrypted.slice(7), 'base64')).toString('utf8'), 'hibbities', 'decrypts correctly');
      AWS.KMS.restore();
      assert.end();
    };
  };
  password.filter('hibbities');
});

test('[template.questions] no parameters', function(assert) {
  var questions = template.questions({});
  assert.deepEqual(questions, [], 'no further questions');
  assert.end();
});

test('[template.questions] no description = no encryption', function(assert) {
  var questions = template.questions({ Parameters: { Undefined: {} } }, { kmsKeyId: 'my-key' });
  questions[0].async = function() {
    return function(err, input) {
      assert.ifError(err, 'success');
      assert.equal(input, 'whatever', 'no encryption');
      assert.end();
    };
  };
  questions[0].filter('whatever');
});

test('[template.questions] handles failure during kms encryption', function(assert) {
  AWS.stub('KMS', 'encrypt', function(params, callback) {
    var err = new Error('Bad encryption error');
    err.code = 'Whoops';
    return callback(err);
  });

  var questions = template.questions(expected, { kmsKeyId: true });

  var password = questions[5];
  password.async = function() {
    return function(err, encrypted) {
      assert.ok(err instanceof template.KmsError, 'expected error type');
      assert.equal(err.toString(), 'KmsError: Whoops: Bad encryption error', 'correct error');
      assert.equal(encrypted, undefined, 'no encrypted return value');
      AWS.KMS.restore();
      assert.end();
    };
  };
  password.filter('hibbities');
});

test('[template.questions] handles kms key lookup failure during kms encryption with special message', function(assert) {
  AWS.stub('KMS', 'encrypt', function(params, callback) {
    var error = new Error('Invalid key');
    error.code = 'NotFoundException';
    return callback(error);
  });

  var questions = template.questions(expected, { kmsKeyId: 'garbage' });

  var password = questions[5];
  password.async = function() {
    return function(err, encrypted) {
      assert.ok(err instanceof template.NotFoundError, 'expected error type');
      assert.equal(err.toString(), 'NotFoundError: Unable to find KMS encryption key "garbage"', 'correct error');
      assert.equal(encrypted, undefined, 'no encrypted return value');
      AWS.KMS.restore();
      assert.end();
    };
  };
  password.filter('hibbities');
});

test('[template.questions] reject defaults that are not in a list of allowed values', function(assert) {
  var parameters = { List: { Type: 'String', AllowedValues: ['one', 'two'] } };
  var overrides = { defaults: { List: 'three' } };

  var questions = template.questions({ Parameters: parameters }, overrides);
  assert.notEqual(questions[0].default, 'three', 'rejected disallowed default value');
  assert.end();
});
