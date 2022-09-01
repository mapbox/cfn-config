import test from 'tape';
import AWS from 'aws-sdk';
import { preauth } from '../index.js';

test('[preauth]', (t) => {
    preauth({
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
