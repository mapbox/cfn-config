const test = require('tape');
const queue = require('d3-queue').queue;
const template = require('../lib/template');
const path = require('path');
const fs = require('fs');
const AWS = require('@mapbox/mock-aws-sdk-js');

const expected = require('./fixtures/template.json');

process.env.AWS_ACCESS_KEY_ID = '-';
process.env.AWS_SECRET_ACCESS_KEY = '-';

test('[template.read] local file does not exist', (t) => {
    template.read('./fake', function(err) {
        t.ok(err instanceof template.NotFoundError, 'returned expected error');
        t.end();
    });
});

test('[template.read] local file cannot be parsed', (t) => {
    template.read(path.resolve(__dirname, 'fixtures', 'malformed-template.json'), function(err) {
        t.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
        t.ok(/Failed to parse .*: Unexpected end/.test(err.message), 'passthrough parse error');
        t.end();
    });
});

test('[template.read] local js file cannot be parsed', (t) => {
    template.read(path.resolve(__dirname, 'fixtures', 'malformed-template.js'), function(err) {
        t.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
        t.ok(/Failed to parse .*/.test(err.message), 'passthrough parse error');
        t.end();
    });
});

test('[template.read] S3 no access', (t) => {
    template.read('s3://mapbox/fake', function(err) {
        t.ok(err instanceof template.NotFoundError, 'returned expected error');
        t.end();
    });
});

test('[template.read] S3 bucket does not exist', (t) => {
    t.plan(2);

    AWS.stub('S3', 'getBucketLocation', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        var error = new Error('Bucket does not exist');
        error.code = 'NotFoundError';
        callback(error);
    });

    template.read('s3://my/template', function(err) {
        t.ok(err instanceof template.NotFoundError, 'returned expected error');
        AWS.S3.restore();
    });
});

test('[template.read] S3 file does not exist', (t) => {
    t.plan(3);

    AWS.stub('S3', 'getObject', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
        var error = new Error('Object does not exist');
        error.code = 'NotFoundError';
        callback(error);
    });

    AWS.stub('S3', 'getBucketLocation', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        callback(null, { LocationConstraint: 'eu-central-1' });
    });

    template.read('s3://my/template', function(err) {
        t.ok(err instanceof template.NotFoundError, 'returned expected error');
        AWS.S3.restore();
    });
});

test('[template.read] S3 file cannot be parsed', (t) => {
    t.plan(3);

    AWS.stub('S3', 'getObject', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
        var malformed = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'malformed-template.json'));
        callback(null, { Body: malformed });
    });

    AWS.stub('S3', 'getBucketLocation', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        callback(null, { LocationConstraint: 'eu-central-1' });
    });

    template.read('s3://my/template', function(err) {
        t.ok(err instanceof template.InvalidTemplateError, 'returned expected error');
        AWS.S3.restore();
    });
});

test('[template.read] local JSON', (t) => {
    template.read(path.resolve(__dirname, 'fixtures', 'template.json'), function(err, found) {
        t.ifError(err, 'success');
        t.deepEqual(found, expected, 'got template JSON');
        t.end();
    });
});

test('[template.read] local sync JS', (t) => {
    template.read(path.resolve(__dirname, 'fixtures', 'template-sync.js'), function(err, found) {
        t.ifError(err, 'success');
        t.deepEqual(found, expected, 'got template JSON');
        t.end();
    });
});

test('[template.read] local sync JS (relative path)', (t) => {
    var relativePath = path.resolve(__dirname, 'fixtures', 'template-sync.js').replace(process.cwd(), '').substr(1);
    t.equal(relativePath[0] !== '/', true, 'relative path: ' + relativePath);
    template.read(relativePath, function(err, found) {
        t.ifError(err, 'success');
        t.deepEqual(found, expected, 'got template JSON');
        t.end();
    });
});

test('[template.read] local async JS with options', (t) => {
    template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'), { some: 'options' }, function(err, found) {
        t.ifError(err, 'success');
        t.deepEqual(found, { some: 'options' }, 'got template JSON');
        t.end();
    });
});

test('[template.read] local async JS without options', (t) => {
    template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'), function(err, found) {
        t.ifError(err, 'success');
        t.deepEqual(found, {}, 'got template JSON');
        t.end();
    });
});

test('[template.read] S3 JSON', (t) => {
    t.plan(4);

    AWS.stub('S3', 'getObject', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
        callback(null, { Body: new Buffer(JSON.stringify(expected)) });
    });

    AWS.stub('S3', 'getBucketLocation', function(params, callback) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        callback(null, { LocationConstraint: '' });
    });

    template.read('s3://my/template', function(err, found) {
        t.ifError(err, 'success');
        t.deepEqual(found, expected, 'got template JSON');
        AWS.S3.restore();
    });
});

test('[template.questions] provides expected questions without encryption', (t) => {
    var questions = template.questions(expected);

    t.equal(questions.length, 6, 'all questions provided');

    var q = queue(1);

    q.defer(function(next) {
        var name = questions[0];
        t.equal(name.type, 'input', 'correct type for Name');
        t.equal(name.name, 'Name', 'correct name for Name');
        t.equal(name.message, 'Name. Someone\'s first name:', 'correct message for Name');
        t.ok(name.validate('Ham'), 'valid success for Name');
        t.notOk(name.validate('ham'), 'invalid success for Name');
        t.notOk(name.validate('H4m'), 'invalid success for Name');
        next();
    });

    q.defer(function(next) {
        var age = questions[1];
        t.equal(age.type, 'input', 'correct type for Age');
        t.equal(age.name, 'Age', 'correct name for Age');
        t.equal(age.message, 'Age:', 'correct message for Age');
        t.ok(age.validate('30'), 'valid success for Age');
        t.notOk(age.validate('ham'), 'invalid success for Age');
        t.notOk(age.validate('180'), 'invalid success for Age');
        t.notOk(age.validate('-180'), 'invalid success for Age');
        next();
    });

    q.defer(function(next) {
        var handedness = questions[2];
        t.equal(handedness.type, 'list', 'correct type for Handedness');
        t.equal(handedness.name, 'Handedness', 'correct name for Handedness');
        t.equal(handedness.message, 'Handedness. Their dominant hand:', 'correct message for Handedness');
        t.equal(handedness.default, 'right', 'correct default value for Handedness');
        t.deepEqual(handedness.choices, ['left', 'right'], 'correct choices for Handedness');
        next();
    });

    q.defer(function(next) {
        var pets = questions[3];
        t.equal(pets.type, 'input', 'correct type for Pets');
        t.equal(pets.name, 'Pets', 'correct name for Pets');
        t.equal(pets.message, 'Pets. The names of their pets:', 'correct message for Pets');
        next();
    });

    q.defer(function(next) {
        var numbers = questions[4];
        t.equal(numbers.type, 'input', 'correct type for LuckyNumbers');
        t.equal(numbers.name, 'LuckyNumbers', 'correct name for LuckyNumbers');
        t.equal(numbers.message, 'LuckyNumbers. Their lucky numbers:', 'correct message for LuckyNumbers');
        t.ok(numbers.validate('30,40'), 'valid success for LuckyNumbers');
        t.notOk(numbers.validate('ham,40'), 'invalid success for LuckyNumbers');
        next();
    });

    q.defer(function(next) {
        var password = questions[5];
        t.equal(password.type, 'password', 'correct type for SecretPassword');
        t.equal(password.name, 'SecretPassword', 'correct name for SecretPassword');
        t.equal(password.message, 'SecretPassword. [secure] Their secret password:', 'correct message for SecretPassword');
        t.ok(password.validate('hibbities'), 'valid success for SecretPassword');
        t.notOk(password.validate('ham'), 'invalid success for SecretPassword');
        t.notOk(password.validate('hamhamhamhamhamhamhamhamham'), 'invalid success for SecretPassword');
        password.async = function() {
            return function(err, unencrypted) {
                t.equal(unencrypted, 'hibbities', 'passes through secret when kms is falsy');
                next();
            };
        };
        password.filter('hibbities');
    });

    q.awaitAll(function(err) {
        t.end(err);
    });
});

test('[template.questions] respects overrides', (t) => {
    AWS.stub('KMS', 'encrypt', function(params, callback) {
        t.equal(params.KeyId, 'this is a bomb key', 'used custom keyId');
        t.ok(params.Plaintext);
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
        t.equal(name.default, 'Chuck', 'overriden default for Name');
        t.equal(name.message, 'Somebody', 'overriden message for Name');
        name.async = function() {
            return function(err, encrypted) {
                t.ok(encrypted, 'filter success for Name');
                t.equal(encrypted, 'Ham', 'passes through non-secret parameters');
                next();
            };
        };
        name.filter('Ham');
    });

    q.defer(function(next) {
        var handedness = questions[2];
        t.deepEqual(handedness.choices, ['top', 'bottom'], 'overriden choices for Handedness');
        next();
    });


    q.defer(function(next) {
        var password = questions[5];
        password.async = function() {
            return function(err, encrypted) {
                t.ifError(err, 'encryption doesn\'t cause errors');
                t.equal(encrypted.slice(0, 7), 'secure:', 'encrypted var starts with secure:');
                t.equal((new Buffer(encrypted.slice(7), 'base64')).toString('utf8'), 'hibbities', 'decrypts correctly');
                next();
            };
        };
        password.filter('hibbities');
    });

    q.defer(function(next) {
        var password = questions[5];
        password.async = function() {
            return function(err, encrypted) {
                t.ifError(err, 'encryption doesn\'t cause errors');
                t.equal(encrypted, 'secure:neverchange', 'passes over secure vars');
                next();
            };
        };
        password.filter('secure:neverchange');
    });

    q.awaitAll(function(err) {
        AWS.KMS.restore();
        t.end(err);
    });
});

test('[template.questions] defaults kms key to correct default', (t) => {
    AWS.stub('KMS', 'encrypt', function(params, callback) {
        t.equal(params.KeyId, 'alias/cloudformation', 'used default keyId');
        t.ok(params.Plaintext);
        return callback(null, { CiphertextBlob: new Buffer(params.Plaintext) });
    });

    var questions = template.questions(expected, { kmsKeyId: true });

    var password = questions[5];
    password.async = function() {
        return function(err, encrypted) {
            t.ifError(err, 'encryption doesn\'t cause errors');
            t.equal(encrypted.slice(0, 7), 'secure:', 'encrypted var starts with secure:');
            t.equal((new Buffer(encrypted.slice(7), 'base64')).toString('utf8'), 'hibbities', 'decrypts correctly');
            AWS.KMS.restore();
            t.end();
        };
    };
    password.filter('hibbities');
});

test('[template.questions] no parameters', (t) => {
    var questions = template.questions({});
    t.deepEqual(questions, [], 'no further questions');
    t.end();
});

test('[template.questions] no description = no encryption', (t) => {
    var questions = template.questions({ Parameters: { Undefined: {} } }, { kmsKeyId: 'my-key' });
    questions[0].async = function() {
        return function(err, input) {
            t.ifError(err, 'success');
            t.equal(input, 'whatever', 'no encryption');
            t.end();
        };
    };
    questions[0].filter('whatever');
});

test('[template.questions] handles failure during kms encryption', (t) => {
    AWS.stub('KMS', 'encrypt', function(params, callback) {
        var err = new Error('Bad encryption error');
        err.code = 'Whoops';
        return callback(err);
    });

    var questions = template.questions(expected, { kmsKeyId: true });

    var password = questions[5];
    password.async = function() {
        return function(err, encrypted) {
            t.ok(err instanceof template.KmsError, 'expected error type');
            t.equal(err.toString(), 'KmsError: Whoops: Bad encryption error', 'correct error');
            t.equal(encrypted, undefined, 'no encrypted return value');
            AWS.KMS.restore();
            t.end();
        };
    };
    password.filter('hibbities');
});

test('[template.questions] handles kms key lookup failure during kms encryption with special message', (t) => {
    AWS.stub('KMS', 'encrypt', function(params, callback) {
        var error = new Error('Invalid key');
        error.code = 'NotFoundException';
        return callback(error);
    });

    var questions = template.questions(expected, { kmsKeyId: 'garbage' });

    var password = questions[5];
    password.async = function() {
        return function(err, encrypted) {
            t.ok(err instanceof template.NotFoundError, 'expected error type');
            t.equal(err.toString(), 'NotFoundError: Unable to find KMS encryption key "garbage"', 'correct error');
            t.equal(encrypted, undefined, 'no encrypted return value');
            AWS.KMS.restore();
            t.end();
        };
    };
    password.filter('hibbities');
});

test('[template.questions] reject defaults that are not in a list of allowed values', (t) => {
    var parameters = { List: { Type: 'String', AllowedValues: ['one', 'two'] } };
    var overrides = { defaults: { List: 'three' } };

    var questions = template.questions({ Parameters: parameters }, overrides);
    t.notEqual(questions[0].default, 'three', 'rejected disallowed default value');
    t.end();
});
