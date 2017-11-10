var test = require('tape');
var AWS = require('aws-sdk');
var cfnConfig = require('..');

test('[preauth]', function(assert) {
  cfnConfig.preauth({
    accessKeyId: 'a',
    secretAccessKey: 'b'
  });

  var cfn = new AWS.CloudFormation({ region: 'us-east-1' });
  assert.deepEqual(cfn.config.credentials, {
    accessKeyId: 'a',
    secretAccessKey: 'b'
  }, 'new clients have preauth credentials');

  AWS.config.credentials = {};

  assert.end();
});
