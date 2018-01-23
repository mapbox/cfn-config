var AWS = require('aws-sdk');

var cfnConfig = {
  actions: require('./lib/actions'),
  commands: require('./lib/commands'),
  lookup: require('./lib/lookup'),
  prompt: require('./lib/prompt'),
  template: require('./lib/template')
};

module.exports = cfnConfig;

module.exports.preauth = function(credentials) {
  AWS.config.credentials = credentials;
  return cfnConfig;
};
