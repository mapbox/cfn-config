const AWS = require('aws-sdk');

const cfnConfig = {
    Actions: require('./lib/actions'),
    Commands: require('./lib/commands'),
    Lookup: require('./lib/lookup'),
    Prompt: require('./lib/prompt'),
    Template: require('./lib/template')
};

module.exports = cfnConfig;

module.exports.preauth = (credentials) => {
    AWS.config.credentials = credentials;
    return cfnConfig;
};
