const test = require('tape');
const queue = require('d3-queue').queue;
const Template = require('../lib/template');
const path = require('path');
const fs = require('fs');
const AWS = require('@mapbox/mock-aws-sdk-js');

const expected = require('./fixtures/template.json');

process.env.AWS_ACCESS_KEY_ID = '-';
process.env.AWS_SECRET_ACCESS_KEY = '-';

test('[template.read] local file does not exist', async (t) => {
    try {
        await Template.read('./fake');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.NotFoundError, 'returned expected error');
    }

    t.end();
});

test('[template.read] local file cannot be parsed', async (t) => {
    try {
        await Template.read(path.resolve(__dirname, 'fixtures', 'malformed-template.json'));
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.InvalidTemplateError, 'returned expected error');
        t.ok(/Failed to parse .*: Unexpected end/.test(err.message), 'passthrough parse error');
    }

    t.end();
});

test('[template.read] local js file cannot be parsed', async (t) => {
    try {
        await Template.read(path.resolve(__dirname, 'fixtures', 'malformed-template.js'));
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.InvalidTemplateError, 'returned expected error');
        t.ok(/Failed to parse .*/.test(err.message), 'passthrough parse error');
    }

    t.end();
});

test('[template.read] S3 no access', async (t) => {
    try {
        await Template.read('s3://mapbox/fake');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.NotFoundError, 'returned expected error');
    }

    t.end();
});

test('[template.read] S3 bucket does not exist', async (t) => {
    AWS.stub('S3', 'getBucketLocation', (params) => {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        const error = new Error('Bucket does not exist');
        error.code = 'NotFoundError';
        throw err;
    });

    try {
        await Template.read('s3://my/template');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.NotFoundError, 'returned expected error');
    }

    AWS.S3.restore();
    t.end();
});

test('[template.read] S3 file does not exist', async (t) => {
    AWS.stub('S3', 'getObject', (params) => {
        t.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
        const error = new Error('Object does not exist');
        error.code = 'NotFoundError';
        throw err;
    });

    AWS.stub('S3', 'getBucketLocation', function(params) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        return this.request.promise.returns(Promise.resolve({ LocationConstraint: 'eu-central-1' }));
    });

    try {
        await Template.read('s3://my/template');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.NotFoundError, 'returned expected error');
    }

    AWS.S3.restore();
    t.end();
});

test('[template.read] S3 file cannot be parsed', async (t) => {
    AWS.stub('S3', 'getObject', function(params) {
        t.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
        const malformed = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'malformed-template.json'));
        return this.request.promise.returns(Promise.resolve({ Body: malformed }));
    });

    AWS.stub('S3', 'getBucketLocation', function(params) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        return this.request.promise.returns(Promise.resolve({ LocationConstraint: 'eu-central-1' }));
    });

    try {
        await Template.read('s3://my/template');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Template.InvalidTemplateError, 'returned expected error');
    }

    AWS.S3.restore();
    t.end();
});

test('[template.read] local JSON', async (t) => {
    try {
        const found = await Template.read(path.resolve(__dirname, 'fixtures', 'template.json'));
        t.deepEqual(found, expected, 'got template JSON');
    } catch (err) {
        t.error(err)
    }

    t.end();
});

test('[template.read] local sync JS', async (t) => {
    try {
        const found = await Template.read(path.resolve(__dirname, 'fixtures', 'template-sync.js'));
        t.deepEqual(found, expected, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] local sync JS (relative path)', async (t) => {
    const relativePath = path.resolve(__dirname, 'fixtures', 'template-sync.js').replace(process.cwd(), '').substr(1);
    t.equal(relativePath[0] !== '/', true, 'relative path: ' + relativePath);

    try {
        const found = await Template.read(relativePath);
        t.deepEqual(found, expected, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] local async JS with options', async (t) => {
    try {
        const found = await Template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'), { some: 'options' });
        t.deepEqual(found, { some: 'options' }, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] local async JS without options', async (t) => {
    try {
        const found = await Template.read(path.resolve(__dirname, 'fixtures', 'template-async.js'));
        t.deepEqual(found, {}, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] S3 JSON', async (t) => {
    AWS.stub('S3', 'getObject', function(params) {
        t.deepEqual(params, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
        return this.request.promise.returns(Promise.resolve({ Body: new Buffer(JSON.stringify(expected)) }));
    });

    AWS.stub('S3', 'getBucketLocation', function(params) {
        t.deepEqual(params, { Bucket: 'my' }, 'requested bucket location');
        return this.request.promise.returns(Promise.resolve({ LocationConstraint: '' }));
    });

    try {
        const found = await Template.read('s3://my/template');
        t.deepEqual(found, expected, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    AWS.S3.restore();
    t.end();
});

test('[template.questions] provides expected questions without encryption', (t) => {
    const questions = Template.questions(expected);

    t.equal(questions.length, 6, 'all questions provided');

    const q = queue(1);

    q.defer(function(next) {
        const name = questions[0];
        t.equal(name.type, 'input', 'correct type for Name');
        t.equal(name.name, 'Name', 'correct name for Name');
        t.equal(name.message, 'Name. Someone\'s first name:', 'correct message for Name');
        t.ok(name.validate('Ham'), 'valid success for Name');
        t.notOk(name.validate('ham'), 'invalid success for Name');
        t.notOk(name.validate('H4m'), 'invalid success for Name');
        next();
    });

    q.defer(function(next) {
        const age = questions[1];
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
        const handedness = questions[2];
        t.equal(handedness.type, 'list', 'correct type for Handedness');
        t.equal(handedness.name, 'Handedness', 'correct name for Handedness');
        t.equal(handedness.message, 'Handedness. Their dominant hand:', 'correct message for Handedness');
        t.equal(handedness.default, 'right', 'correct default value for Handedness');
        t.deepEqual(handedness.choices, ['left', 'right'], 'correct choices for Handedness');
        next();
    });

    q.defer(function(next) {
        const pets = questions[3];
        t.equal(pets.type, 'input', 'correct type for Pets');
        t.equal(pets.name, 'Pets', 'correct name for Pets');
        t.equal(pets.message, 'Pets. The names of their pets:', 'correct message for Pets');
        next();
    });

    q.defer(function(next) {
        const numbers = questions[4];
        t.equal(numbers.type, 'input', 'correct type for LuckyNumbers');
        t.equal(numbers.name, 'LuckyNumbers', 'correct name for LuckyNumbers');
        t.equal(numbers.message, 'LuckyNumbers. Their lucky numbers:', 'correct message for LuckyNumbers');
        t.ok(numbers.validate('30,40'), 'valid success for LuckyNumbers');
        t.notOk(numbers.validate('ham,40'), 'invalid success for LuckyNumbers');
        next();
    });

    q.defer(function(next) {
        const password = questions[5];
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

    const overrides = {
        defaults: { Name: 'Chuck' },
        messages: { Name: 'Somebody' },
        choices: { Handedness: ['top', 'bottom'] },
        kmsKeyId: 'this is a bomb key'
    };

    const questions = Template.questions(expected, overrides);

    const q = queue(1);

    q.defer(function(next) {
        const name = questions[0];
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
        const handedness = questions[2];
        t.deepEqual(handedness.choices, ['top', 'bottom'], 'overriden choices for Handedness');
        next();
    });


    q.defer(function(next) {
        const password = questions[5];
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
        const password = questions[5];
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

    const questions = Template.questions(expected, { kmsKeyId: true });

    const password = questions[5];
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
    const questions = Template.questions({});
    t.deepEqual(questions, [], 'no further questions');
    t.end();
});

test('[template.questions] no description = no encryption', (t) => {
    const questions = Template.questions({ Parameters: { Undefined: {} } }, { kmsKeyId: 'my-key' });
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
        const err = new Error('Bad encryption error');
        err.code = 'Whoops';
        return callback(err);
    });

    const questions = Template.questions(expected, { kmsKeyId: true });

    const password = questions[5];
    password.async = function() {
        return function(err, encrypted) {
            t.ok(err instanceof Template.KmsError, 'expected error type');
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
        const error = new Error('Invalid key');
        error.code = 'NotFoundException';
        return callback(error);
    });

    const questions = Template.questions(expected, { kmsKeyId: 'garbage' });

    const password = questions[5];
    password.async = function() {
        return function(err, encrypted) {
            t.ok(err instanceof Template.NotFoundError, 'expected error type');
            t.equal(err.toString(), 'NotFoundError: Unable to find KMS encryption key "garbage"', 'correct error');
            t.equal(encrypted, undefined, 'no encrypted return value');
            AWS.KMS.restore();
            t.end();
        };
    };
    password.filter('hibbities');
});

test('[template.questions] reject defaults that are not in a list of allowed values', (t) => {
    const parameters = { List: { Type: 'String', AllowedValues: ['one', 'two'] } };
    const overrides = { defaults: { List: 'three' } };

    const questions = Template.questions({ Parameters: parameters }, overrides);
    t.notEqual(questions[0].default, 'three', 'rejected disallowed default value');
    t.end();
});
