var tape = require('tape');
var config = require('../index.js');
var prefix = 'build-to-fix';

tape('./cloudformation/build-to-fix.template', function(assert) {
  var templatePath = './cloudformation/build-to-fix.template';
  assert.equal(config.solveTemplatePath(templatePath), prefix, 'Right prefix');
  assert.end();
});

tape('cloudformation/build-to-fix.template', function(assert) {
  var templatePath = 'cloudformation/build-to-fix.template';
  assert.equal(config.solveTemplatePath(templatePath), prefix, 'Right prefix');
  assert.end();
});

tape('./cloudformation/build-to-fix.template.js', function(assert) {
  var templatePath = './cloudformation/build-to-fix.template.js';
  assert.equal(config.solveTemplatePath(templatePath), prefix, 'Right prefix');
  assert.end();
});

tape('cloudformation/build-to-fix.template.js', function(assert) {
  var templatePath = 'cloudformation/build-to-fix.template.js';
  assert.equal(config.solveTemplatePath(templatePath), prefix, 'Right prefix');
  assert.end();
});