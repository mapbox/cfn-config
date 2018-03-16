var test = require('tape');

var lookup = require('../lib/lookup');
var AWS = require('@mapbox/mock-aws-sdk-js');

var template = require('./fixtures/template.json');

test('[lookup.info] describeStacks error', function(assert) {
  AWS.stub('CloudFormation', 'describeStacks').yields(new Error('cloudformation failed'));

  lookup.info('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof lookup.CloudFormationError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.info] stack does not exist', function(assert) {
  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    var err = new Error('Stack with id my-stack does not exist');
    err.code = 'ValidationError';
    callback(err);
  });

  lookup.info('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof lookup.StackNotFoundError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.info] stack info not returned', function(assert) {
  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    callback(null, { Stacks: [] });
  });

  lookup.info('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof lookup.StackNotFoundError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.info] success', function(assert) {
  var date = new Date();

  var stackInfo = {
    StackId: 'stack-id',
    StackName: 'my-stack',
    Description: 'test-stack',
    Parameters: [
      { ParameterKey: 'Name', ParameterValue: 'Chuck' },
      { ParameterKey: 'Age', ParameterValue: 18 },
      { ParameterKey: 'Handedness', ParameterValue: 'left' },
      { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
      { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
      { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
    ],
    CreationTime: date,
    LastUpdatedTime: date,
    StackStatus: 'CREATE_COMPLETE',
    DisableRollback: false,
    NotificationARNs: ['some-arn'],
    TimeoutInMinutes: 10,
    Capabilities: 'CAPABILITY_IAM',
    Outputs: [
      {
        OutputKey: 'Blah',
        OutputValue: 'blah',
        Description: 'nothing'
      }
    ],
    Tags: [
      {
        Key: 'Category',
        Value: 'Peeps'
      }
    ]
  };

  var expected = {
    StackId: 'stack-id',
    StackName: 'my-stack',
    Description: 'test-stack',
    Region: 'us-east-1',
    Parameters: {
      Name: 'Chuck',
      Age: 18,
      Handedness: 'left',
      Pets: 'Duck,Wombat',
      LuckyNumbers: '3,7,42',
      SecretPassword: 'secret'
    },
    CreationTime: date,
    LastUpdatedTime: date,
    StackStatus: 'CREATE_COMPLETE',
    DisableRollback: false,
    NotificationARNs: ['some-arn'],
    TimeoutInMinutes: 10,
    Capabilities: 'CAPABILITY_IAM',
    Outputs: { Blah: 'blah' },
    Tags: { Category: 'Peeps' }
  };

  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    callback(null, { Stacks: [stackInfo] });
  });

  lookup.info('my-stack', 'us-east-1', function(err, info) {
    assert.ifError(err, 'success');
    assert.deepEqual(info, expected, 'expected info returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test.test('[lookup.info] with resources', function(assert) {
  AWS.stub('CloudFormation', 'describeStacks').yields(null, { Stacks: [{}] });
  AWS.stub('CloudFormation', 'listStackResources').returns({
    eachPage: (callback) => {
      callback(null, { StackResourceSummaries: [{ resource1: 'ohai' }] }, () => {
        callback(null, { StackResourceSummaries: [{ resource2: 'ohai' }] }, () => {
          callback();
        });
      });
    }
  });

  lookup.info('my-stack', 'us-east-1', true, function(err, info) {
    assert.ifError(err, 'success');
    assert.deepEqual(info.StackResources, [{ resource1: 'ohai' }, { resource2: 'ohai' }], 'added stack resources');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test.test('[lookup.info] resource lookup failure', function(assert) {
  AWS.stub('CloudFormation', 'describeStacks').yields(null, { Stacks: [{}] });

  AWS.stub('CloudFormation', 'listStackResources').returns({
    eachPage: (callback) => {
      callback(null, { StackResourceSummaries: [{ resource1: 'ohai' }] }, () => {
        callback(new Error('failure'), null);
      });
    }
  });

  lookup.info('my-stack', 'us-east-1', true, function(err) {
    assert.ok(err instanceof lookup.CloudFormationError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.parameters] lookup.info error', function(assert) {
  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    callback(null, { Stacks: [] });
  });

  lookup.parameters('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof lookup.StackNotFoundError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.info] secure', function(assert) {
  var date = new Date();

  var stackInfo = {
    StackId: 'stack-id',
    StackName: 'my-stack',
    Description: 'test-stack',
    Parameters: [
      { ParameterKey: 'PlainText', ParameterValue: 'Hello world!' },
      { ParameterKey: 'SecureVarA', ParameterValue: 'secure:' + (new Buffer('EncryptedValue1')).toString('base64') },
      { ParameterKey: 'SecureVarB', ParameterValue: 'secure:' + (new Buffer('EncryptedValue2')).toString('base64') }
    ],
    CreationTime: date,
    LastUpdatedTime: date,
    StackStatus: 'CREATE_COMPLETE',
    DisableRollback: false,
    NotificationARNs: ['some-arn'],
    TimeoutInMinutes: 10,
    Capabilities: 'CAPABILITY_IAM',
    Outputs: [],
    Tags: []
  };

  var expected = {
    StackId: 'stack-id',
    StackName: 'my-stack',
    Description: 'test-stack',
    Region: 'us-east-1',
    Parameters: {
      PlainText: 'Hello world!',
      SecureVarA: 'DecryptedValue1',
      SecureVarB: 'DecryptedValue2'
    },
    CreationTime: date,
    LastUpdatedTime: date,
    StackStatus: 'CREATE_COMPLETE',
    DisableRollback: false,
    NotificationARNs: ['some-arn'],
    TimeoutInMinutes: 10,
    Capabilities: 'CAPABILITY_IAM',
    Outputs: {},
    Tags: {}
  };

  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    callback(null, { Stacks: [stackInfo] });
  });

  AWS.stub('KMS', 'decrypt', function(params, callback) {
    var encrypted = new Buffer(params.CiphertextBlob, 'base64').toString('utf8');
    if (encrypted === 'EncryptedValue1')
      return callback(null, { Plaintext: (new Buffer('DecryptedValue1')).toString('base64') });
    if (encrypted === 'EncryptedValue2')
      return callback(null, { Plaintext: (new Buffer('DecryptedValue2')).toString('base64') });
    assert.fail('Unrecognized encrypted value ' + encrypted);
  });

  lookup.info('my-stack', 'us-east-1', false, true, function(err, info) {
    assert.ifError(err, 'success');
    assert.deepEqual(info, expected, 'expected info returned');
    AWS.CloudFormation.restore();
    AWS.KMS.restore();
    assert.end();
  });
});

test('[lookup.info] secure error', function(assert) {
  var stackInfo = {
    StackId: 'stack-id',
    StackName: 'my-stack',
    Description: 'test-stack',
    Parameters: [
      { ParameterKey: 'PlainText', ParameterValue: 'Hello world!' },
      { ParameterKey: 'SecureVarA', ParameterValue: 'secure:' + (new Buffer('EncryptedValue1')).toString('base64') },
      { ParameterKey: 'SecureVarB', ParameterValue: 'secure:' + (new Buffer('EncryptedValue2')).toString('base64') }
    ],
    CreationTime: new Date(),
    LastUpdatedTime: new Date(),
    StackStatus: 'CREATE_COMPLETE',
    DisableRollback: false,
    NotificationARNs: ['some-arn'],
    TimeoutInMinutes: 10,
    Capabilities: 'CAPABILITY_IAM',
    Outputs: [],
    Tags: []
  };

  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    callback(null, { Stacks: [stackInfo] });
  });

  AWS.stub('KMS', 'decrypt', function(params, callback) {
    callback(new Error('KMS decryption error'));
  });

  lookup.info('my-stack', 'us-east-1', false, true, function(err) {
    assert.ok(err instanceof lookup.DecryptParametersError, 'expected error returned');
    AWS.CloudFormation.restore();
    AWS.KMS.restore();
    assert.end();
  });
});

test('[lookup.parameters] success', function(assert) {
  var stackInfo = {
    StackId: 'stack-id',
    StackName: 'my-stack',
    Description: 'test-stack',
    Parameters: [
      { ParameterKey: 'Name', ParameterValue: 'Chuck' },
      { ParameterKey: 'Age', ParameterValue: 18 },
      { ParameterKey: 'Handedness', ParameterValue: 'left' },
      { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
      { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
      { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
    ],
    CreationTime: new Date(),
    LastUpdatedTime: new Date(),
    StackStatus: 'CREATE_COMPLETE',
    DisableRollback: false,
    NotificationARNs: ['some-arn'],
    TimeoutInMinutes: 10,
    Capabilities: 'CAPABILITY_IAM',
    Outputs: [
      {
        OutputKey: 'Blah',
        OutputValue: 'blah',
        Description: 'nothing'
      }
    ],
    Tags: [
      {
        Key: 'Category',
        Value: 'Peeps'
      }
    ]
  };

  var expected = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
    callback(null, { Stacks: [stackInfo] });
  });

  lookup.parameters('my-stack', 'us-east-1', function(err, info) {
    assert.ifError(err, 'success');
    assert.deepEqual(info, expected, 'expected parameters returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.template] getTemplate error', function(assert) {
  AWS.stub('CloudFormation', 'getTemplate', function(params, callback) {
    callback(new Error('cloudformation failed'));
  });

  lookup.template('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof lookup.CloudFormationError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.template] stack does not exist', function(assert) {
  AWS.stub('CloudFormation', 'getTemplate', function(params, callback) {
    var err = new Error('Stack with id my-stack does not exist');
    err.code = 'ValidationError';
    callback(err);
  });

  lookup.template('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof lookup.StackNotFoundError, 'expected error returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.template] success', function(assert) {
  AWS.stub('CloudFormation', 'getTemplate', function(params, callback) {
    callback(null, {
      RequestMetadata: { RequestId: 'db317457-46f2-11e6-8ee0-fbc06d2d1322' },
      TemplateBody: JSON.stringify(template)
    });
  });

  lookup.template('my-stack', 'us-east-1', function(err, body) {
    assert.ifError(err, 'success');
    assert.deepEqual(body, template, 'expected template body returned');
    AWS.CloudFormation.restore();
    assert.end();
  });
});

test('[lookup.configurations] bucket location error', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(new Error('failure'));
  });

  lookup.configurations('my-stack', 'my-bucket', function(err) {
    assert.ok(err instanceof lookup.S3Error, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configurations] bucket does not exist', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'listObjects', function(params, callback) {
    var err = new Error('The specified bucket does not exist');
    err.code = 'NoSuchBucket';
    callback(err);
  });

  lookup.configurations('my-stack', 'my-bucket', function(err) {
    assert.ok(err instanceof lookup.BucketNotFoundError, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configurations] S3 error', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'listObjects', function(params, callback) {
    assert.equal(params.Prefix, 'my-stack/', 'listObjects called with proper prefix');
    var err = new Error('something unexpected');
    callback(err);
  });

  lookup.configurations('my-stack', 'my-bucket', function(err) {
    assert.ok(err instanceof lookup.S3Error, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configurations] no saved configs found', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'listObjects', function(params, callback) {
    callback(null, { Contents: [] });
  });

  lookup.configurations('my-stack', 'my-bucket', function(err, configs) {
    assert.ifError(err, 'success');
    assert.deepEqual(configs, [], 'expected empty array of configs');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configurations] found multiple saved configs', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'listObjects', function(params, callback) {
    callback(null, {
      Contents: [
        { Key: 'my-stack/staging.cfn.json', Size: 10 },
        { Key: 'my-stack/production.cfn.json', Size: 10 },
        { Key: 'my-stack/something-else', Size: 10 },
        { Key: 'my-stack/folder', Size: 0 }
      ]
    });
  });

  lookup.configurations('my-stack', 'my-bucket', function(err, configs) {
    assert.ifError(err, 'success');
    assert.deepEqual(configs, [
      'staging',
      'production'
    ], 'expected array of configs');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configurations] region specified', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'listObjects', function(params, callback) {
    callback(null, { Contents: [] });
  });

  lookup.configurations('my-stack', 'my-bucket', 'cn-north-1', function() {
    assert.ok(AWS.S3.calledWith({
      signatureVersion: 'v4',
      region: 'cn-north-1'
    }), 'created S3 client in requested region');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configuration] bucket location error', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(new Error('failure'));
  });

  lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1', function(err) {
    assert.ok(err instanceof lookup.S3Error, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configuration] bucket does not exist', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    var err = new Error('The specified bucket does not exist');
    err.code = 'NoSuchBucket';
    callback(err);
  });

  lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1', function(err) {
    assert.ok(err instanceof lookup.BucketNotFoundError, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configuration] S3 error', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    assert.equal(params.Key, 'my-stack/my-stack-staging-us-east-1.cfn.json', 'getObject called with proper key');
    var err = new Error('something unexpected');
    callback(err);
  });

  lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1', function(err) {
    assert.ok(err instanceof lookup.S3Error, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configuration] requested configuration does not exist', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    var err = new Error('The specified key does not exist.');
    err.code = 'NoSuchKey';
    callback(err);
  });

  lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1', function(err) {
    assert.ok(err instanceof lookup.ConfigurationNotFoundError, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configuration] cannot parse object data', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    callback(null, { Body: new Buffer('invalid') });
  });

  lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1', function(err) {
    assert.ok(err instanceof lookup.InvalidConfigurationError, 'expected error returned');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.configuration] success', function(assert) {
  var info = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'my-stack/my-stack-staging-us-east-1.cfn.json'
    }, 'requested expected configuration');

    callback(null, { Body: new Buffer(JSON.stringify(info)) });
  });

  lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1', function(err, configuration) {
    assert.ifError(err, 'success');
    assert.deepEqual(configuration, info, 'returned expected stack info');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.defaultConfiguration] bucket location error', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(new Error('failure'));
  });

  lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json', function(err, info) {
    assert.ifError(err, 'ignored error');
    assert.deepEqual(info, {}, 'provided blank info');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.defaultConfiguration] requested configuration does not exist', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    var err = new Error('The specified key does not exist.');
    err.code = 'NoSuchKey';
    callback(err);
  });

  lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json', function(err, info) {
    assert.ifError(err, 'ignored error');
    assert.deepEqual(info, {}, 'provided blank info');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.defaultConfiguration] cannot parse object data', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    callback(null, { Body: new Buffer('invalid') });
  });

  lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json', function(err, info) {
    assert.ifError(err, 'ignored error');
    assert.deepEqual(info, {}, 'provided blank info');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.defaultConfiguration] success', function(assert) {
  var info = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.stub('S3', 'getObject', function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'my-config.cfn.json'
    }, 'requested expected default configuration');

    callback(null, { Body: new Buffer(JSON.stringify(info)) });
  });

  lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json', function(err, configuration) {
    assert.ifError(err, 'success');
    assert.deepEqual(configuration, info, 'returned expected stack info');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.bucketRegion] no bucket', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    var err = new Error('failure');
    err.code = 'NoSuchBucket';
    callback(err);
  });

  lookup.bucketRegion('my-bucket', function(err) {
    assert.ok(err instanceof lookup.BucketNotFoundError, 'expected error type');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.bucketRegion] failure', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    var err = new Error('failure');
    callback(err);
  });

  lookup.bucketRegion('my-bucket', function(err) {
    assert.ok(err instanceof lookup.S3Error, 'expected error type');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.bucketRegion] no bucket', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    var err = new Error('failure');
    err.code = 'NoSuchBucket';
    callback(err);
  });

  lookup.bucketRegion('my-bucket', function(err) {
    assert.ok(err instanceof lookup.BucketNotFoundError, 'expected error type');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.bucketRegion] region specified', function(assert) {
  AWS.stub('S3', 'getBucketLocation', function(params, callback) {
    var err = new Error('failure');
    err.code = 'NoSuchBucket';
    callback(err);
  });

  lookup.bucketRegion('my-bucket', 'cn-north-1', function() {
    assert.ok(AWS.S3.calledWith({
      signatureVersion: 'v4',
      region: 'cn-north-1'
    }), 'used region in S3 client configuration');
    AWS.S3.restore();
    assert.end();
  });
});

test('[lookup.decryptParameters] failure', function(assert) {
  AWS.stub('KMS', 'decrypt', function(params, callback) {
    var err = new Error('failure');
    callback(err);
  });

  lookup.decryptParameters({
    ValueA: 'secure:0123456789'
  }, 'us-west-1', function(err) {
    assert.ok(err instanceof lookup.DecryptParametersError, 'expected error type');
    AWS.KMS.restore();
    assert.end();
  });
});

test('[lookup.decryptParameters] success', function(assert) {
  AWS.stub('KMS', 'decrypt', function(params, callback) {
    var encrypted = new Buffer(params.CiphertextBlob, 'base64').toString('utf8');
    if (encrypted === 'EncryptedValue1')
      return callback(null, { Plaintext: (new Buffer('DecryptedValue1')).toString('base64') });
    if (encrypted === 'EncryptedValue2')
      return callback(null, { Plaintext: (new Buffer('DecryptedValue2')).toString('base64') });
    assert.fail('Unrecognized encrypted value ' + encrypted);
  });

  lookup.decryptParameters({
    PlainText: 'Hello world!',
    SecureVarA: 'secure:' + (new Buffer('EncryptedValue1')).toString('base64'),
    SecureVarB: 'secure:' + (new Buffer('EncryptedValue2')).toString('base64')
  }, 'us-west-1', function(err, decryptedParams) {
    assert.ifError(err, 'success');
    assert.deepEqual(decryptedParams, {
      PlainText: 'Hello world!',
      SecureVarA: 'DecryptedValue1',
      SecureVarB: 'DecryptedValue2'
    }, 'decryptes secure parameters');
    AWS.KMS.restore();
    assert.end();
  });
});
