const test = require('tape');
const sinon = require('sinon');
const inquirer = require('inquirer');
const prompt = require('../lib/prompt');

test('[prompt.confirm] single-line, confirm', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      default: true,
      type: 'confirm',
      name: 'confirmation',
      message: 'confirm?'
    }, 'inquirer called with correct question');

    return Promise.resolve({ confirmation: true });
  });

  prompt.confirm('confirm?', function(err, ready) {
    assert.ifError(err, 'success');
    assert.ok(ready, 'received user confirmation');
    inquirer.prompt.restore();
    assert.end();
  });
});

test('[prompt.confirm] single-line, false default', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      type: 'confirm',
      name: 'confirmation',
      message: 'confirm?',
      default: false
    }, 'inquirer called with correct question');

    return Promise.resolve({ confirmation: true });
  });

  prompt.confirm('confirm?', false, function(err, ready) {
    assert.ifError(err, 'success');
    assert.ok(ready, 'received user confirmation');
    inquirer.prompt.restore();
    assert.end();
  });
});

test('[prompt.confirm] multi-line, reject', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      default: true,
      type: 'confirm',
      name: 'confirmation',
      message: 'confirm?'
    }, 'inquirer called with correct question');

    return Promise.resolve({ confirmation: false });
  });

  prompt.confirm('title\nexplanation\nconfirm?', function(err, ready) {
    assert.ifError(err, 'success');
    assert.notOk(ready, 'received user confirmation');
    inquirer.prompt.restore();
    assert.end();
  });
});

test('[prompt.configuration] success', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      type: 'list',
      name: 'config',
      message: 'Saved configurations',
      choices: ['a', 'b', 'New configuration']
    }, 'inquirer called with correct question');

    return Promise.resolve({ config: 'a' });
  });

  prompt.configuration(['a', 'b'], function(err, config) {
    assert.ifError(err, 'success');
    assert.equal(config, 'a', 'received user selection');
    inquirer.prompt.restore();
    assert.end();
  });
});

test('[prompt.parameters] success', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      questions: 'passed through'
    }, 'passes through provided questions');

    return Promise.resolve({ questions: 'answers', needsStringify: 6 });
  });

  prompt.parameters({ questions: 'passed through' }, function(err, answers) {
    assert.ifError(err, 'success');
    assert.deepEqual(answers, { questions: 'answers', needsStringify: '6' }, 'received user responses');
    inquirer.prompt.restore();
    assert.end();
  });
});

test('[prompt.input] no default value', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      type: 'input',
      name: 'data',
      default: undefined,
      message: 'what:'
    }, 'asks the right question');

    return Promise.resolve({ data: 'answers' });
  });

  prompt.input('what:', function(err, response) {
    assert.ifError(err, 'success');
    assert.equal(response, 'answers', 'received user response');
    inquirer.prompt.restore();
    assert.end();
  });
});

test('[prompt.input] with default value', function(assert) {
  sinon.stub(inquirer, 'prompt').callsFake(function(questions) {
    assert.deepEqual(questions, {
      type: 'input',
      name: 'data',
      default: 'hibbity',
      message: 'what:'
    }, 'asks the right question');

    return Promise.resolve({ data: 'answers' });
  });

  prompt.input('what:', 'hibbity', function(err, response) {
    assert.ifError(err, 'success');
    assert.equal(response, 'answers', 'received user response');
    inquirer.prompt.restore();
    assert.end();
  });
});
