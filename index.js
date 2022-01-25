const AWS = require('aws-sdk');

const cfnConfig = {
    actions: require('./lib/actions'),
    commands: require('./lib/commands'),
    lookup: require('./lib/lookup'),
    prompt: require('./lib/prompt'),
    template: require('./lib/template')
};

module.exports = cfnConfig;

module.exports.preauth = (credentials) => {
    AWS.config.credentials = credentials;
    return cfnConfig;
};
