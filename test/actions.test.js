var path = require('path');
var fs = require('fs');
var events = require('events');
var test = require('tape');
var AWS = require('aws-sdk-mock');
var actions = require('../lib/actions');

test('[actions.create] invalid parameters', function(assert) {
  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    var err = new Error('Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.create('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.create] stack name in use', function(assert) {
  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    var err = new Error('Stack [my-stack] already exists');
    err.code = 'AlreadyExistsException';
    callback(err);
  });

  actions.create('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.create] template url does not exist', function(assert) {
  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    var err = new Error('Template file referenced by https://s3.amazonaws.com/bucket/key does not exist.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.create('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.create] template url is invalid', function(assert) {
  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    var err = new Error('The specified url must be an Amazon S3 URL.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.create('my-stack', 'us-east-1', 's3://bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.create] template is invalid', function(assert) {
  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    var err = new Error('Template format error: At least one Resources member must be defined.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.create('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.create] unexpected cloudformation error', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.create('my-stack', 'us-east-1', url, {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.create] success', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'createStack', function(params, callback) {
    assert.deepEqual(params, {
      StackName: 'my-stack',
      Capabilities: ['CAPABILITY_IAM'],
      TemplateURL: url,
      Parameters: [
        { ParameterKey: 'Name', ParameterValue: 'Chuck' },
        { ParameterKey: 'Age', ParameterValue: 18 },
        { ParameterKey: 'Handedness', ParameterValue: 'left' },
        { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
        { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
        { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
      ]
    }, 'createStack with expected params');
    callback();
  });

  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  actions.create('my-stack', 'us-east-1', url, parameters, function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'createStack');
    assert.end();
  });
});

test('[actions.update] invalid parameters', function(assert) {
  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    var err = new Error('Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.update('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.update] stack does not exist', function(assert) {
  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    var err = new Error('Stack [my-stack] does not exist');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.update('my-stack', 'us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.update] template url does not exist', function(assert) {
  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    var err = new Error('Template file referenced by https://s3.amazonaws.com/bucket/key does not exist.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.update('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.update] template url is invalid', function(assert) {
  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    var err = new Error('The specified url must be an Amazon S3 URL.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.update('my-stack', 'us-east-1', 's3://bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.update] template is invalid', function(assert) {
  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    var err = new Error('Template format error: At least one Resources member must be defined.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.update('my-stack', 'us-east-1', 'https://s3.amazonaws.com/bucket/key', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'returned expected error type');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.update] unexpected cloudformation error', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.update('my-stack', 'us-east-1', url, {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.update] success', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'updateStack', function(params, callback) {
    assert.deepEqual(params, {
      StackName: 'my-stack',
      Capabilities: ['CAPABILITY_IAM'],
      TemplateURL: url,
      Parameters: [
        { ParameterKey: 'Name', ParameterValue: 'Chuck' },
        { ParameterKey: 'Age', ParameterValue: 18 },
        { ParameterKey: 'Handedness', ParameterValue: 'left' },
        { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
        { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
        { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
      ]
    }, 'updateStack with expected params');

    callback();
  });

  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  actions.update('my-stack', 'us-east-1', url, parameters, function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'updateStack');
    assert.end();
  });
});

test('[actions.delete] stack does not exist', function(assert) {
  AWS.mock('CloudFormation', 'deleteStack', function(params, callback) {
    var err = new Error('Stack [my-stack] does not exist');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.delete('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'deleteStack');
    assert.end();
  });
});

test('[actions.delete] unexpected cloudformation error', function(assert) {
  AWS.mock('CloudFormation', 'deleteStack', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.delete('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'deleteStack');
    assert.end();
  });
});

test('[actions.delete] success', function(assert) {
  AWS.mock('CloudFormation', 'deleteStack', function(params, callback) {
    assert.deepEqual(params, { StackName: 'my-stack' }, 'deleteStack with expected params');
    callback();
  });

  actions.delete('my-stack', 'us-east-1', function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'deleteStack');
    assert.end();
  });
});

test('[actions.diff] stack does not exist', function(assert) {
  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    var err = new Error('Stack [my-stack] does not exist');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.diff('my-stack', 'us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    assert.end();
  });
});

test('[actions.diff] invalid parameters', function(assert) {
  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    var err = new Error('Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.diff('my-stack', 'us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    assert.end();
  });
});

test('[actions.diff] template url does not exist', function(assert) {
  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    var err = new Error('Template file referenced by https://my-bucket.s3.amazonaws.com/my-template.json does not exist.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.diff('my-stack', 'us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    assert.end();
  });
});

test('[actions.diff] template url is invalid', function(assert) {
  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    var err = new Error('The specified url must be an Amazon S3 URL.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.diff('my-stack', 'us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    assert.end();
  });
});

test('[actions.diff] template is invalid', function(assert) {
  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    var err = new Error('Template format error: At least one Resources member must be defined.');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.diff('my-stack', 'us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    assert.end();
  });
});

test('[actions.diff] unexpected createChangeSet error', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.diff('my-stack', 'us-east-1', url, {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    assert.end();
  });
});

test('[actions.diff] unexpected describeChangeSet error', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    callback(null, { Id: 'changeset:arn' });
  });

  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.diff('my-stack', 'us-east-1', url, {}, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'createChangeSet');
    AWS.restore('CloudFormation', 'describeChangeSet');
    assert.end();
  });
});

test('[actions.diff] changeset failed to create', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
  var changesetId;

  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    changesetId = params.ChangeSetName;
    callback(null, { Id: 'changeset:arn' });
  });

  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    callback(null, {
      ChangeSetName: changesetId,
      ChangeSetId: 'changeset:arn',
      StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
      StackName: 'my-stack',
      ExecutionStatus: 'UNAVAILABLE',
      Status: 'FAILED'
    });
  });

  actions.diff('my-stack', 'us-east-1', url, {}, function(err, data) {
    assert.ifError(err, 'success');
    assert.deepEqual(data, {
      id: changesetId,
      status: 'FAILED',
      execution: 'UNAVAILABLE'
    }, 'returned changeset details');
    AWS.restore('CloudFormation', 'createChangeSet');
    AWS.restore('CloudFormation', 'describeChangeSet');
    assert.end();
  });
});

test('[actions.diff] success', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
  var changesetId;
  var polled = 0;

  AWS.mock('CloudFormation', 'createChangeSet', function(params, callback) {
    assert.ok(/^[\w\d-]{1,128}$/.test(params.ChangeSetName), 'createChangeSet valid change set name');
    assert.deepEqual(params, {
      ChangeSetName: params.ChangeSetName,
      StackName: 'my-stack',
      Capabilities: ['CAPABILITY_IAM'],
      Parameters: [
        { ParameterKey: 'Name', ParameterValue: 'Chuck' },
        { ParameterKey: 'Age', ParameterValue: 18 },
        { ParameterKey: 'Handedness', ParameterValue: 'right' },
        { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
        { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
        { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
      ],
      TemplateURL: url
    }, 'createChangeSet expected parameters');

    changesetId = params.ChangeSetName;
    callback(null, { Id: 'changeset:arn' });
  });

  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    polled++;

    assert.deepEqual(params, {
      ChangeSetName: changesetId,
      StackName: 'my-stack'
    }, 'describeChangeSet expected parameters');

    if (polled === 1) return callback(null, { Status: 'CREATE_IN_PROGRESS' });

    // This is a partial response object
    callback(null, {
      ChangeSetName: changesetId,
      ChangeSetId: 'changeset:arn',
      StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
      StackName: 'my-stack',
      ExecutionStatus: 'AVAILABLE',
      Status: 'CREATE_COMPLETE',
      Changes: [
        {
          Type: 'Resource',
          ResourceChange: {
            Action: 'Modify',
            LogicalResourceId: 'Topic',
            PhysicalResourceId: 'arn:aws:sns:us-east-1:123456789012:my-stack-Topic-DQ8MBRPFONMK',
            ResourceType: 'AWS::SNS::Topic',
            Replacement: 'False'
          }
        }
      ]
    });
  });

  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'right',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  actions.diff('my-stack', 'us-east-1', url, parameters, function(err, data) {
    assert.ifError(err, 'success');
    assert.deepEqual(data, {
      id: changesetId,
      status: 'CREATE_COMPLETE',
      execution: 'AVAILABLE',
      changes: [
        {
          action: 'Modify',
          name: 'Topic',
          id: 'arn:aws:sns:us-east-1:123456789012:my-stack-Topic-DQ8MBRPFONMK',
          type: 'AWS::SNS::Topic',
          replacement: false
        }
      ]
    }, 'returned changeset details');
    AWS.restore('CloudFormation', 'createChangeSet');
    AWS.restore('CloudFormation', 'describeChangeSet');
    assert.end();
  });
});

test('[actions.executeChangeSet] describeChangeSet error', function(assert) {
  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error');
    AWS.restore('CloudFormation', 'describeChangeSet');
    assert.end();
  });
});

test('[actions.executeChangeSet] changeset not executable', function(assert) {
  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    callback(null, {
      ExecutionStatus: 'UNAVAILABLE',
      Status: 'CREATE_COMPLETE',
      StatusReason: 'because I said so'
    });
  });

  actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
    assert.ok(err instanceof actions.ChangeSetNotExecutableError, 'expected error');
    assert.equal(err.execution, 'UNAVAILABLE', 'err object exposes execution status');
    assert.equal(err.status, 'CREATE_COMPLETE', 'err object exposes status');
    assert.equal(err.reason, 'because I said so', 'err object exposes status reason');
    AWS.restore('CloudFormation', 'describeChangeSet');
    assert.end();
  });
});

test('[actions.executeChangeSet] executeChangeSet error', function(assert) {
  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    callback(null, {
      ExecutionStatus: 'AVAILABLE',
      Status: 'CREATE_COMPLETE'
    });
  });

  AWS.mock('CloudFormation', 'executeChangeSet', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error');
    AWS.restore('CloudFormation', 'describeChangeSet');
    AWS.restore('CloudFormation', 'executeChangeSet');
    assert.end();
  });
});

test('[actions.executeChangeSet] success', function(assert) {
  AWS.mock('CloudFormation', 'describeChangeSet', function(params, callback) {
    assert.deepEqual(params, {
      ChangeSetName: 'changeset-id',
      StackName: 'my-stack'
    }, 'expected params provided to describeChangeSet');

    callback(null, {
      ExecutionStatus: 'AVAILABLE',
      Status: 'CREATE_COMPLETE'
    });
  });

  AWS.mock('CloudFormation', 'executeChangeSet', function(params, callback) {
    assert.deepEqual(params, {
      ChangeSetName: 'changeset-id',
      StackName: 'my-stack'
    }, 'expected params provided to executeChangeSet');

    callback();
  });

  actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'describeChangeSet');
    AWS.restore('CloudFormation', 'executeChangeSet');
    assert.end();
  });
});

test('[actions.validate] unexpected validateTemplate error', function(assert) {
  var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

  AWS.mock('CloudFormation', 'validateTemplate', function(params, callback) {
    assert.deepEqual(params, { TemplateURL: url }, 'validateTemplate with expected params');
    callback(new Error('unexpected'));
  });

  actions.validate('us-east-1', url, function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error returned');
    AWS.restore('CloudFormation', 'validateTemplate');
    assert.end();
  });
});

test('[actions.validate] invalid template', function(assert) {
  AWS.mock('CloudFormation', 'validateTemplate', function(params, callback) {
    var err = new Error('Unresolved resource dependencies [Name] in the Outputs block of the template');
    err.code = 'ValidationError';
    callback(err);
  });

  actions.validate('us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error type');
    AWS.restore('CloudFormation', 'validateTemplate');
    assert.end();
  });
});

test('[actions.validate] valid template', function(assert) {
  AWS.mock('CloudFormation', 'validateTemplate', function(params, callback) {
    assert.deepEqual(params, {
      TemplateURL: 'https://my-bucket.s3.amazonaws.com/my-template.json'
    }, 'expected params passed to validateTemplate');

    callback();
  });

  actions.validate('us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'validateTemplate');
    assert.end();
  });
});

test('[actions.saveConfiguration] bucket does not exist', function(assert) {
  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.mock('S3', 'putObject', function(params, callback) {
    var err = new Error('The specified bucket does not exist');
    err.code = 'NoSuchBucket';
    callback(err);
  });

  actions.saveConfiguration('my-stack', 'my-bucket', 'my-config', parameters, function(err) {
    assert.ok(err instanceof actions.BucketNotFoundError, 'expected error returned');
    AWS.restore('S3', 'getBucketLocation');
    AWS.restore('S3', 'putObject');
    assert.end();
  });
});

test('[actions.saveConfiguration] unexpected putObject error', function(assert) {
  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.mock('S3', 'putObject', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.saveConfiguration('my-stack', 'my-bucket', 'my-config', parameters, function(err) {
    assert.ok(err instanceof actions.S3Error, 'expected error returned');
    AWS.restore('S3', 'getBucketLocation');
    AWS.restore('S3', 'putObject');
    assert.end();
  });
});

test('[actions.saveConfiguration] success with encryption', function(assert) {
  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.mock('S3', 'putObject', function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'my-stack/my-config.cfn.json',
      Body: JSON.stringify(parameters),
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: 'my-key'
    }, 'expected putObject parameters');
    callback();
  });

  actions.saveConfiguration('my-stack', 'my-bucket', 'my-config', parameters, 'my-key', function(err) {
    assert.ifError(err, 'success');
    AWS.restore('S3', 'getBucketLocation');
    AWS.restore('S3', 'putObject');
    assert.end();
  });
});

test('[actions.saveConfiguration] success without encryption', function(assert) {
  var parameters = {
    Name: 'Chuck',
    Age: 18,
    Handedness: 'left',
    Pets: 'Duck,Wombat',
    LuckyNumbers: '3,7,42',
    SecretPassword: 'secret'
  };

  AWS.mock('S3', 'getBucketLocation', function(params, callback) {
    callback(null, 'us-east-1');
  });

  AWS.mock('S3', 'putObject', function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'my-stack/my-config.cfn.json',
      Body: JSON.stringify(parameters)
    }, 'expected putObject parameters');
    callback();
  });

  actions.saveConfiguration('my-stack', 'my-bucket', 'my-config', parameters, function(err) {
    assert.ifError(err, 'success');
    AWS.restore('S3', 'putObject');
    AWS.restore('S3', 'getBucketLocation');
    assert.end();
  });
});

test('[actions.templateUrl] us-east-1', function(assert) {
  var url = actions.templateUrl('my-bucket', 'us-east-1', 'my-stack');
  var re = /https:\/\/s3.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
  assert.ok(re.test(url), 'expected url');
  assert.end();
});

test('[actions.templateUrl] cn-north-1', function(assert) {
  var url = actions.templateUrl('my-bucket', 'cn-north-1', 'my-stack');
  var re = /https:\/\/s3.cn-north-1.amazonaws.com.cn\/my-bucket\/.*-my-stack.template.json/;
  assert.ok(re.test(url), 'expected url');
  assert.end();
});

test('[actions.templateUrl] eu-central-1', function(assert) {
  var url = actions.templateUrl('my-bucket', 'eu-central-1', 'my-stack');
  var re = /https:\/\/s3-eu-central-1.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
  assert.ok(re.test(url), 'expected url');
  assert.end();
});

test('[actions.saveTemplate] bucket does not exist', function(assert) {
  var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
  var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
  var AWS = require('aws-sdk');
  var S3 = AWS.S3;

  AWS.S3 = function(params) {
    assert.deepEqual(params, { region: 'us-east-1' });
  };
  AWS.S3.prototype.putObject = function(params, callback) {
    var err = new Error('The specified bucket does not exist');
    err.code = 'NoSuchBucket';
    callback(err);
  };

  actions.saveTemplate(url, template, function(err) {
    assert.ok(err instanceof actions.BucketNotFoundError, 'expected error returned');
    AWS.S3 = S3;
    assert.end();
  });
});

test('[actions.saveTemplate] s3 error', function(assert) {
  var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
  var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
  AWS.mock('S3', 'putObject', function(params, callback) {
    callback(new Error('unexpected'));
  });

  actions.saveTemplate(url, template, function(err) {
    assert.ok(err instanceof actions.S3Error, 'expected error returned');
    AWS.restore('S3', 'putObject');
    assert.end();
  });
});

test('[actions.saveTemplate] us-east-1', function(assert) {
  var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
  var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));

  // really need a way to mock the client constructor

  AWS.mock('S3', 'putObject', function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
      Body: template
    }, 'template put to expected s3 destination');

    callback();
  });

  actions.saveTemplate(url, template, function(err) {
    assert.ifError(err, 'success');
    AWS.restore('S3', 'putObject');
    assert.end();
  });
});

test('[actions.saveTemplate] cn-north-1', function(assert) {
  var url = 'https://s3-cn-north-1.amazonaws.com.cn/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
  var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
  var AWS = require('aws-sdk');
  var S3 = AWS.S3;

  AWS.S3 = function(params) {
    assert.deepEqual(params, { region: 'cn-north-1' }, 'parses cn-north-1 from s3 url');
  };
  AWS.S3.prototype.putObject = function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
      Body: template
    }, 'template put to expected s3 destination');
    callback();
  };

  actions.saveTemplate(url, template, function(err) {
    assert.ifError(err, 'success');
    AWS.S3 = S3;
    assert.end();
  });
});

test('[actions.saveTemplate] eu-central-1', function(assert) {
  var url = 'https://s3-eu-central-1.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
  var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
  var AWS = require('aws-sdk');
  var S3 = AWS.S3;

  AWS.S3 = function(params) {
    assert.deepEqual(params, { region: 'eu-central-1' }, 'parses eu-central-1 from s3 url');
  };
  AWS.S3.prototype.putObject = function(params, callback) {
    assert.deepEqual(params, {
      Bucket: 'my-bucket',
      Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
      Body: template
    }, 'template put to expected s3 destination');
    callback();
  };

  actions.saveTemplate(url, template, function(err) {
    assert.ifError(err, 'success');
    AWS.S3 = S3;
    assert.end();
  });
});

test('[actions.monitor] error', function(assert) {
  AWS.mock('CloudFormation', 'describeStackEvents', function(params, callback) {
    callback(new Error('failure'));
    return new events.EventEmitter();
  });

  actions.monitor('my-stack', 'us-east-1', function(err) {
    assert.ok(err instanceof actions.CloudFormationError, 'expected error type');
    AWS.restore('CloudFormation', 'describeStackEvents');
    assert.end();
  });
});

test('[actions.monitor] success', function(assert) {
  var once = true;

  AWS.mock('CloudFormation', 'describeStacks', function(params, callback) {
    setTimeout(callback, 1000, null, {
      Stacks: [
        { StackStatus: 'CREATE_COMPLETE' }
      ]
    });

    return new events.EventEmitter();
  });

  AWS.mock('CloudFormation', 'describeStackEvents', function(params, callback) {
    if (!once) {
      callback(null, { StackEvents: [] });
    } else {
      callback(null, {
        StackEvents: [
          {
            EventId: 'done',
            LogicalResourceId: 'my-stack',
            ResourceType: 'AWS::CloudFormation::Stack',
            ResourceStatus: 'CREATE_COMPLETE'
          },
          {
            EventId: 'built',
            LogicalResourceId: 'Topic',
            ResourceStatus: 'CREATE_COMPLETE'
          },
          {
            EventId: 'continue',
            LogicalResourceId: 'Topic',
            ResourceStatus: 'CREATE_IN_PROGRESS',
            ResourceStatusReason: 'Creation has begun'
          },
          {
            EventId: 'start',
            LogicalResourceId: 'Topic',
            ResourceStatus: 'CREATE_IN_PROGRESS'
          },
          {
            EventId: 'create',
            LogicalResourceId: 'my-stack',
            ResourceType: 'AWS::CloudFormation::Stack',
            ResourceStatus: 'CREATE_IN_PROGRESS',
            ResourceStatusReason: 'User Initiated'
          }
        ]
      });
    }
    once = false;
    return new events.EventEmitter();
  });

  actions.monitor('my-stack', 'us-east-1', function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'describeStacks');
    AWS.restore('CloudFormation', 'describeStackEvents');
    assert.end();
  });
});

test('[actions.monitor] success w/ slow polling', function(assert) {
  var once = true;

  AWS.mock('CloudFormation', 'describeStacks', function(params, callback) {
    setTimeout(callback, 1000, null, {
      Stacks: [
        { StackStatus: 'CREATE_COMPLETE' }
      ]
    });

    return new events.EventEmitter();
  });

  AWS.mock('CloudFormation', 'describeStackEvents', function(params, callback) {
    if (!once) {
      callback(null, { StackEvents: [] });
    } else {
      callback(null, {
        StackEvents: [
          {
            EventId: 'done',
            LogicalResourceId: 'my-stack',
            ResourceType: 'AWS::CloudFormation::Stack',
            ResourceStatus: 'CREATE_COMPLETE'
          },
          {
            EventId: 'built',
            LogicalResourceId: 'Topic',
            ResourceStatus: 'CREATE_COMPLETE'
          },
          {
            EventId: 'continue',
            LogicalResourceId: 'Topic',
            ResourceStatus: 'CREATE_IN_PROGRESS',
            ResourceStatusReason: 'Creation has begun'
          },
          {
            EventId: 'start',
            LogicalResourceId: 'Topic',
            ResourceStatus: 'CREATE_IN_PROGRESS'
          },
          {
            EventId: 'create',
            LogicalResourceId: 'my-stack',
            ResourceType: 'AWS::CloudFormation::Stack',
            ResourceStatus: 'CREATE_IN_PROGRESS',
            ResourceStatusReason: 'User Initiated'
          }
        ]
      });
    }
    once = false;
    return new events.EventEmitter();
  });

  actions.monitor('my-stack', 'us-east-1', 20000, function(err) {
    assert.ifError(err, 'success');
    AWS.restore('CloudFormation', 'describeStacks');
    AWS.restore('CloudFormation', 'describeStackEvents');
    assert.end();
  });
});
