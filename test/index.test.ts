import test from 'tape';
import CFNConfig from '../index.js';

test('Auth', (t) => {
    const cfn = new CFNConfig({
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'a',
            secretAccessKey: 'b'
        }
    });

    t.deepEqual(cfn.client, {
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'a',
            secretAccessKey: 'b'
        }
    }, 'new clients have preauth credentials');

    t.end();
});
