const test = require('tape');
const AWS = require('aws-sdk');
const cfnConfig = require('..');

test('[preauth]', (t) => {
    cfnConfig.preauth({
        accessKeyId: 'a',
        secretAccessKey: 'b'
    });

    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    t.deepEqual(cfn.config.credentials, {
        accessKeyId: 'a',
        secretAccessKey: 'b'
    }, 'new clients have preauth credentials');

    AWS.config.credentials = {};

    t.end();
});
