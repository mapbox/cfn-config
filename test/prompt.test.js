const test = require('tape');
const sinon = require('sinon');
const inquirer = require('inquirer');
const prompt = require('../lib/prompt');

test('[prompt.confirm] single-line, confirm', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            default: true,
            type: 'confirm',
            name: 'confirmation',
            message: 'confirm?'
        }, 'inquirer called with correct question');

        return Promise.resolve({ confirmation: true });
    });

    try {
        const ready = prompt.confirm('confirm?');
        t.ok(ready, 'received user confirmation');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});

test('[prompt.confirm] single-line, false default', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            type: 'confirm',
            name: 'confirmation',
            message: 'confirm?',
            default: false
        }, 'inquirer called with correct question');

        return Promise.resolve({ confirmation: true });
    });

    try {
        const ready = await prompt.confirm('confirm?', false);
        t.ok(ready, 'received user confirmation');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});

test('[prompt.confirm] multi-line, reject', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            default: true,
            type: 'confirm',
            name: 'confirmation',
            message: 'confirm?'
        }, 'inquirer called with correct question');

        return Promise.resolve({ confirmation: false });
    });

    try {
        const ready = await prompt.confirm('title\nexplanation\nconfirm?');
        t.notOk(ready, 'received user confirmation');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});

test('[prompt.configuration] success', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            type: 'list',
            name: 'config',
            message: 'Saved configurations',
            choices: ['a', 'b', 'New configuration']
        }, 'inquirer called with correct question');

        return Promise.resolve({ config: 'a' });
    });

    try {
        const config = await prompt.configuration(['a', 'b']);
        t.equal(config, 'a', 'received user selection');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});

test('[prompt.parameters] success', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            questions: 'passed through'
        }, 'passes through provided questions');

        return Promise.resolve({ questions: 'answers', needsStringify: 6 });
    });

    try {
        const answers = await prompt.parameters({ questions: 'passed through' });
        t.deepEqual(answers, { questions: 'answers', needsStringify: '6' }, 'received user responses');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});

test('[prompt.input] no default value', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            type: 'input',
            name: 'data',
            default: undefined,
            message: 'what:'
        }, 'asks the right question');

        return Promise.resolve({ data: 'answers' });
    });

    try {
        const response = await prompt.input('what:');
        t.equal(response, 'answers', 'received user response');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});

test('[prompt.input] with default value', async(t) => {
    sinon.stub(inquirer, 'prompt').callsFake((questions) => {
        t.deepEqual(questions, {
            type: 'input',
            name: 'data',
            default: 'hibbity',
            message: 'what:'
        }, 'asks the right question');

        return Promise.resolve({ data: 'answers' });
    });

    try {
        const response = await prompt.input('what:', 'hibbity');
        t.equal(response, 'answers', 'received user response');
    } catch (err) {
        t.error(err);
    }

    inquirer.prompt.restore();
    t.end();
});
