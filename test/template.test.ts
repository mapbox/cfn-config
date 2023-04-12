import test from 'tape';
import TemplateReader, { Template } from '../lib/template.js';
import fs from 'fs';
import Sinon from 'sinon';
import S3 from '@aws-sdk/client-s3';

const expected = JSON.parse(String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url))));

test('[template.read] local file does not exist', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('./fake', import.meta.url));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.NotFoundError, 'returned expected error');
    }

    t.end();
});

test('[template.read] local file cannot be parsed', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('./fixtures/malformed-template.json', import.meta.url));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.InvalidTemplateError, 'returned expected error');
        t.ok(/Expected ',' or '}' after property value in JSON at position/.test(err.message), 'passthrough parse error');
    }

    t.end();
});

test('[template.read] local js file cannot be parsed', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('./fixtures/malformed-template.js', import.meta.url));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.InvalidTemplateError, 'returned expected error');
        t.ok(/Failed to parse .*/.test(err.message), 'passthrough parse error');
    }

    t.end();
});

test('[template.read] S3 no access', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('s3://mapbox/fake'));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.NotFoundError, 'returned expected error');
    }

    t.end();
});

test('[template.read] S3 bucket does not exist', async(t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        t.ok(command instanceof S3.GetBucketLocationCommand);
        t.deepEqual(command.input, { Bucket: 'my' }, 'requested bucket location');
        const err: any = new Error('Bucket does not exist');
        err.code = 'NotFoundError';
        throw err;
    });

    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('s3://my/template'));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.NotFoundError, 'returned expected error');
    }

    Sinon.restore();
    t.end();
});

test('[template.read] S3 file does not exist', async(t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetObjectCommand) {
            t.deepEqual(command.input, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
            const err: any = new Error('Object does not exist');
            err.code = 'NotFoundError';
            throw err;
        } else if (command instanceof S3.GetBucketLocationCommand) {
            t.deepEqual(command.input, { Bucket: 'my' }, 'requested bucket location');
            return Promise.resolve({ LocationConstraint: 'eu-central-1' });
        }
    });

    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('s3://my/template'));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.NotFoundError, 'returned expected error');
    }

    Sinon.restore();
    t.end();
});

test('[template.read] S3 file cannot be parsed', async(t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetObjectCommand) {
            t.deepEqual(command.input, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
            const malformed = fs.readFileSync(new URL('./fixtures/malformed-template.json', import.meta.url));
            return Promise.resolve({ Body: malformed });
        } else if (command instanceof S3.GetBucketLocationCommand) {
            t.deepEqual(command.input, { Bucket: 'my' }, 'requested bucket location');
            return Promise.resolve({ LocationConstraint: 'eu-central-1' });
        }
    });

    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await tr.read(new URL('s3://my/template'));
        t.fail();
    } catch (err) {
        t.ok(err instanceof TemplateReader.InvalidTemplateError, 'returned expected error');
    }

    Sinon.restore();
    t.end();
});

test('[template.read] local JSON', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const found = await tr.read(new URL('./fixtures/template.json', import.meta.url));
        t.deepEqual(found.body, expected, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] local sync JS', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const found = await tr.read(new URL('./fixtures/template-sync.js', import.meta.url));
        t.deepEqual(found.body, expected, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] local async JS with options', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const found = await tr.read(new URL('./fixtures/template-async.js', import.meta.url), { some: 'options' });
        t.deepEqual(found.body, {
            some: 'options',
            Description: '',
            Parameters: {},
            Resources: {}
        }, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] local async JS without options', async(t) => {
    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const found = await tr.read(new URL('./fixtures/template-async.js', import.meta.url));
        t.deepEqual(found.body, {
            Description: '',
            Parameters: {},
            Resources: {}
        }, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('[template.read] S3 JSON', async (t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetObjectCommand) {
            t.deepEqual(command.input, { Bucket: 'my', Key: 'template' }, 'requested correct S3 object');
            return Promise.resolve({ Body: new Buffer(JSON.stringify(expected)) });
        } else if (command instanceof S3.GetBucketLocationCommand) {
            t.deepEqual(command.input, { Bucket: 'my' }, 'requested bucket location');
            return Promise.resolve({ LocationConstraint: '' });
        }
    });

    try {
        const tr = new TemplateReader({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const found = await tr.read(new URL('s3://my/template'));
        t.deepEqual(found.body, expected, 'got template JSON');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[template.questions] provides expected questions without encryption', async (t) => {
    const tr = new TemplateReader({
        region: 'us-east-1',
        credentials: { accessKeyId: '-', secretAccessKey: '-' }
    })

    const questions = tr.questions(new Template(expected));

    t.equal(questions.length, 6, 'all questions provided');

    const name = questions[0];
    t.equal(name.type, 'input', 'correct type for Name');
    t.equal(name.name, 'Name', 'correct name for Name');
    t.equal(name.message, 'Name. Someone\'s first name:', 'correct message for Name');
    t.ok(name.validate('Ham'), 'valid success for Name');
    t.notOk(name.validate('ham'), 'invalid success for Name');
    t.notOk(name.validate('H4m'), 'invalid success for Name');

    const age = questions[1];
    t.equal(age.type, 'input', 'correct type for Age');
    t.equal(age.name, 'Age', 'correct name for Age');
    t.equal(age.message, 'Age:', 'correct message for Age');
    t.ok(age.validate('30'), 'valid success for Age');
    t.notOk(age.validate('ham'), 'invalid success for Age');
    t.notOk(age.validate('180'), 'invalid success for Age');
    t.notOk(age.validate('-180'), 'invalid success for Age');

    const handedness = questions[2];
    t.equal(handedness.type, 'list', 'correct type for Handedness');
    t.equal(handedness.name, 'Handedness', 'correct name for Handedness');
    t.equal(handedness.message, 'Handedness. Their dominant hand:', 'correct message for Handedness');
    t.equal(handedness.default, 'right', 'correct default value for Handedness');
    t.deepEqual(handedness.choices, ['left', 'right'], 'correct choices for Handedness');

    const pets = questions[3];
    t.equal(pets.type, 'input', 'correct type for Pets');
    t.equal(pets.name, 'Pets', 'correct name for Pets');
    t.equal(pets.message, 'Pets. The names of their pets:', 'correct message for Pets');

    const numbers = questions[4];
    t.equal(numbers.type, 'input', 'correct type for LuckyNumbers');
    t.equal(numbers.name, 'LuckyNumbers', 'correct name for LuckyNumbers');
    t.equal(numbers.message, 'LuckyNumbers. Their lucky numbers:', 'correct message for LuckyNumbers');
    t.ok(numbers.validate('30,40'), 'valid success for LuckyNumbers');
    t.notOk(numbers.validate('ham,40'), 'invalid success for LuckyNumbers');

    const password = questions[5];
    t.equal(password.type, 'password', 'correct type for SecretPassword');
    t.equal(password.name, 'SecretPassword', 'correct name for SecretPassword');
    t.equal(password.message, 'SecretPassword. [secure] Their secret password:', 'correct message for SecretPassword');
    t.ok(password.validate('hibbities'), 'valid success for SecretPassword');
    t.notOk(password.validate('ham'), 'invalid success for SecretPassword');
    t.notOk(password.validate('hamhamhamhamhamhamhamhamham'), 'invalid success for SecretPassword');

    t.end();
});

test('[template.questions] no parameters', (t) => {
    const tr = new TemplateReader({
        region: 'us-east-1',
        credentials: { accessKeyId: '-', secretAccessKey: '-' }
    })
    const questions = tr.questions(new Template({}));
    t.deepEqual(questions, [], 'no further questions');
    t.end();
});

test('[template.questions] reject defaults that are not in a list of allowed values', (t) => {
    const parameters = { List: { Type: 'String', AllowedValues: ['one', 'two'] } };
    const overrides = new Map();
    overrides.set('defaults', { List: 'three' });

    const tr = new TemplateReader({
        region: 'us-east-1',
        credentials: { accessKeyId: '-', secretAccessKey: '-' }
    })
    const questions = tr.questions(new Template({ Parameters: parameters }), overrides);
    t.notEqual(questions[0].default, 'three', 'rejected disallowed default value');
    t.end();
});
