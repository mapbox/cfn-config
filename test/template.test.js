var test = require('tape');
var template = require('../lib/template');
var path = require('path');
var fs = require('fs');
var AWS = require('aws-sdk-mock');

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

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    var error = new Error('Bucket does not exist');
    error.code = 'NotFoundError';
    callback(error);
  });

  template.read('s3://my/template', function(err) {
    assert.ok(err instanceof template.NotFoundError, 'returned expected error');
    AWS.restore('S3');
  });
});

test('[template.read] S3 file does not exist', function(assert) {
  assert.plan(3);

  AWS.mock('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
    var error = new Error('Object does not exist');
    error.code = 'NotFoundError';
    callback(error);
  });

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    callback(null, { LocationConstraint: 'eu-central-1' });
  });

  template.read('s3://my/template', function(err) {
    assert.ok(err instanceof template.NotFoundError, 'returned expected error');
    AWS.restore('S3');
  });
});

test('[template.read] S3 file cannot be parsed', function(assert) {
  assert.plan(3);

  AWS.mock('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
    var malformed = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'malformed-template.json'));
    callback(null, { Body: malformed });
  });

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    callback(null, { LocationConstraint: 'eu-central-1' });
  });

  template.read('s3://my/template', function(err) {
    assert.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
    AWS.restore('S3');
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

test('[template.read] local async JS', function(assert) {
  template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'), function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, expected, 'got template JSON');
    assert.end();
  });
});

test('[template.read] S3 JSON', function(assert) {
  assert.plan(4);

  AWS.mock('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
    callback(null, { Body: new Buffer(JSON.stringify(expected)) });
  });

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    assert.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
    callback(null, { LocationConstraint: '' });
  });

  template.read('s3://my/template', function(err, found) {
    assert.ifError(err, 'success');
    assert.deepEqual(found, expected, 'got template JSON');
    AWS.restore('S3');
  });
});

test('[template.questions] provides expected questions', function(assert) {
  var questions = template.questions(expected);

  assert.equal(questions.length, 6, 'all questions provided');

  var name = questions[0];
  assert.equal(name.type, 'input', 'correct type for Name');
  assert.equal(name.name, 'Name', 'correct name for Name');
  assert.equal(name.message, 'Name. Someone\'s first name:', 'correct message for Name');
  assert.ok(name.validate('Ham'), 'valid success for Name');
  assert.notOk(name.validate('ham'), 'invalid success for Name');
  assert.notOk(name.validate('H4m'), 'invalid success for Name');

  var age = questions[1];
  assert.equal(age.type, 'input', 'correct type for Age');
  assert.equal(age.name, 'Age', 'correct name for Age');
  assert.equal(age.message, 'Age:', 'correct message for Age');
  assert.ok(age.validate('30'), 'valid success for Age');
  assert.notOk(age.validate('ham'), 'invalid success for Age');
  assert.notOk(age.validate('180'), 'invalid success for Age');
  assert.notOk(age.validate('-180'), 'invalid success for Age');

  var handedness = questions[2];
  assert.equal(handedness.type, 'list', 'correct type for Handedness');
  assert.equal(handedness.name, 'Handedness', 'correct name for Handedness');
  assert.equal(handedness.message, 'Handedness. Their dominant hand:', 'correct message for Handedness');
  assert.equal(handedness.default, 'right', 'correct default value for Handedness');
  assert.deepEqual(handedness.choices, ['left', 'right'], 'correct choices for Handedness');

  var pets = questions[3];
  assert.equal(pets.type, 'input', 'correct type for Pets');
  assert.equal(pets.name, 'Pets', 'correct name for Pets');
  assert.equal(pets.message, 'Pets. The names of their pets:', 'correct message for Pets');

  var numbers = questions[4];
  assert.equal(numbers.type, 'input', 'correct type for LuckyNumbers');
  assert.equal(numbers.name, 'LuckyNumbers', 'correct name for LuckyNumbers');
  assert.equal(numbers.message, 'LuckyNumbers. Their lucky numbers:', 'correct message for LuckyNumbers');
  assert.ok(numbers.validate('30,40'), 'valid success for LuckyNumbers');
  assert.notOk(numbers.validate('ham,40'), 'invalid success for LuckyNumbers');

  var password = questions[5];
  assert.equal(password.type, 'password', 'correct type for SecretPassword');
  assert.equal(password.name, 'SecretPassword', 'correct name for SecretPassword');
  assert.equal(password.message, 'SecretPassword. Their secret password:', 'correct message for SecretPassword');
  assert.ok(password.validate('hibbities'), 'valid success for SecretPassword');
  assert.notOk(password.validate('ham'), 'invalid success for SecretPassword');
  assert.notOk(password.validate('hamhamhamhamhamhamhamhamham'), 'invalid success for SecretPassword');

  assert.end();
});

test('[template.questions] respects overrides', function(assert) {
  var overrides = {
    defaults: { Name: 'Chuck' },
    messages: { Name: 'Somebody' },
    choices: { Handedness: ['top', 'bottom'] }
  };

  var questions = template.questions(expected, overrides);

  var name = questions[0];
  assert.equal(name.default, 'Chuck', 'overriden default for Name');
  assert.equal(name.message, 'Somebody', 'overriden message for Name');

  var handedness = questions[2];
  assert.deepEqual(handedness.choices, ['top', 'bottom'], 'overriden choices for Handedness');

  assert.end();
});
