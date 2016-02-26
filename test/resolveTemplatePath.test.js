var tape = require('tape');
var config = require('../index.js');
var prefix = 'myStack';

tape('./cloudformation/myStack.template', function(assert) {
    var templatePath = './cloudformation/myStack.template';
    assert.equal(config.resolveTemplatePath(templatePath), prefix, 'Uses correct prefix');
    assert.end();
});

tape('cloudformation/myStack.template', function(assert) {
    var templatePath = 'cloudformation/myStack.template';
    assert.equal(config.resolveTemplatePath(templatePath), prefix, 'Uses correct prefix');
    assert.end();
});

tape('./cloudformation/myStack.template.js', function(assert) {
    var templatePath = './cloudformation/myStack.template.js';
    assert.equal(config.resolveTemplatePath(templatePath), prefix, 'Uses correct prefix');
    assert.end();
});

tape('cloudformation/myStack.template.js', function(assert) {
    var templatePath = 'cloudformation/myStack.template.js';
    assert.equal(config.resolveTemplatePath(templatePath), prefix, 'Uses correct prefix');
    assert.end();
});