const path = require('path');
const fs = require('fs');
const events = require('events');
const test = require('tape');
const AWS = require('@mapbox/mock-aws-sdk-js');
const actions = require('../lib/actions');

test('[actions.diff] stack does not exist', (t) => {
    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        var err = new Error('Stack [my-stack] does not exist');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] invalid parameters', (t) => {
    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        var err = new Error('Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] template url does not exist', (t) => {
    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        var err = new Error('Template file referenced by https://my-bucket.s3.amazonaws.com/my-template.json does not exist.');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] template url is invalid', (t) => {
    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        var err = new Error('The specified url must be an Amazon S3 URL.');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] template is invalid', (t) => {
    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        var err = new Error('Template format error: At least one Resources member must be defined.');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] createChangeSet error on wrong changeSetType', (t) => {
    var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        var err = new Error('\'INVALID\' at \'changeSetType\' failed to satisfy constraint: Member must satisfy enum value set: [UPDATE, CREATE]');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.diff('my-stack', 'us-east-1', 'INVALID', url, {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] unexpected createChangeSet error', (t) => {
    var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', url, {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] unexpected describeChangeSet error', (t) => {
    var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        callback(null, { Id: 'changeset:arn' });
    });

    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', url, {}, false, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] changeset failed to create', (t) => {
    var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
    var changesetId;

    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        changesetId = params.ChangeSetName;
        callback(null, { Id: 'changeset:arn' });
    });

    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        callback(null, {
            ChangeSetName: changesetId,
            ChangeSetId: 'changeset:arn',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
            StackName: 'my-stack',
            ExecutionStatus: 'UNAVAILABLE',
            Status: 'FAILED'
        });
    });

    actions.diff('my-stack', 'us-east-1', 'UPDATE', url, {}, false, function(err, data) {
        t.ifError(err, 'success');
        t.deepEqual(data, {
            id: changesetId,
            status: 'FAILED',
            execution: 'UNAVAILABLE'
        }, 'returned changeset details');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.diff] success', (t) => {
    var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
    var changesetId;
    var polled = 0;

    AWS.stub('CloudFormation', 'createChangeSet', function(params, callback) {
        t.ok(/^[\w\d-]{1,128}$/.test(params.ChangeSetName), 'createChangeSet valid change set name');
        t.deepEqual(params, {
            ChangeSetName: params.ChangeSetName,
            ChangeSetType: 'UPDATE',
            StackName: 'my-stack',
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
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

    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        polled++;
        t.equal(params.ChangeSetName, changesetId, 'describe correct changeset');
        t.equal(params.StackName, 'my-stack', 'describe correct stackname');
        if (params.NextToken) t.equal(params.NextToken, 'xxx', 'used next token to paginate');

        if (polled === 1) return callback(null, { ChangeSetName: changesetId,
            ChangeSetId: 'changeset:arn1',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
            StackName: 'my-stack',
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_IN_PROGRESS',
            Changes: []
        });

        if (polled === 2) return callback(null, {
            ChangeSetName: changesetId,
            ChangeSetId: 'changeset:arn1',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
            StackName: 'my-stack',
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_IN_PROGRESS',
            Changes: [{
                Type: 'Resource',
                ResourceChange: {
                    Action: 'Modify',
                    LogicalResourceId: 'Topic',
                    PhysicalResourceId: 'arn:aws:sns:us-east-1:123456789012:another-stack-Topic-ABCDEFGHIJKL',
                    ResourceType: 'AWS::SNS::Topic',
                    Replacement: 'False'
                }
            }]
        });

        if (polled === 3) return callback(null, {
            ChangeSetName: changesetId,
            ChangeSetId: 'changeset:arn1',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
            StackName: 'my-stack',
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_COMPLETE',
            Changes: [{
                Type: 'Resource',
                ResourceChange: {
                    Action: 'Modify',
                    LogicalResourceId: 'Topic',
                    PhysicalResourceId: 'arn:aws:sns:us-east-1:123456789012:another-stack-Topic-ABCDEFGHIJKL',
                    ResourceType: 'AWS::SNS::Topic',
                    Replacement: 'False'
                }
            }],
            NextToken: 'xxx'
        });

        // This is a partial response object
        callback(null, {
            ChangeSetName: 'aa507e2bdfc55947035a07271e75384efe',
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

    var parameters = [
        { ParameterKey: 'Name', ParameterValue: 'Chuck' },
        { ParameterKey: 'Age', ParameterValue: 18 },
        { ParameterKey: 'Handedness', ParameterValue: 'right' },
        { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
        { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
        { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
    ];

    actions.diff('my-stack', 'us-east-1', 'UPDATE', url, parameters, true, function(err, data) {
        t.ifError(err, 'success');
        t.deepEqual(data, {
            id: 'aa507e2bdfc55947035a07271e75384efe',
            status: 'CREATE_COMPLETE',
            execution: 'AVAILABLE',
            changes: [
                {
                    id: 'arn:aws:sns:us-east-1:123456789012:another-stack-Topic-ABCDEFGHIJKL',
                    name: 'Topic',
                    type: 'AWS::SNS::Topic',
                    action: 'Modify',
                    replacement: false
                },
                {
                    id: 'arn:aws:sns:us-east-1:123456789012:my-stack-Topic-DQ8MBRPFONMK',
                    name: 'Topic',
                    type: 'AWS::SNS::Topic',
                    action: 'Modify',
                    replacement: false
                }
            ]
        }, 'returned changeset details');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.executeChangeSet] describeChangeSet error', (t) => {
    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.executeChangeSet] changeset not executable', (t) => {
    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        callback(null, {
            ExecutionStatus: 'UNAVAILABLE',
            Status: 'CREATE_COMPLETE',
            StatusReason: 'because I said so'
        });
    });

    actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
        t.ok(err instanceof actions.ChangeSetNotExecutableError, 'expected error');
        t.equal(err.execution, 'UNAVAILABLE', 'err object exposes execution status');
        t.equal(err.status, 'CREATE_COMPLETE', 'err object exposes status');
        t.equal(err.reason, 'because I said so', 'err object exposes status reason');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.executeChangeSet] executeChangeSet error', (t) => {
    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        callback(null, {
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_COMPLETE'
        });
    });

    AWS.stub('CloudFormation', 'executeChangeSet', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.executeChangeSet] success', (t) => {
    AWS.stub('CloudFormation', 'describeChangeSet', function(params, callback) {
        t.deepEqual(params, {
            ChangeSetName: 'changeset-id',
            StackName: 'my-stack',
            NextToken: undefined
        }, 'expected params provided to describeChangeSet');

        callback(null, {
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_COMPLETE'
        });
    });

    AWS.stub('CloudFormation', 'executeChangeSet', function(params, callback) {
        t.deepEqual(params, {
            ChangeSetName: 'changeset-id',
            StackName: 'my-stack'
        }, 'expected params provided to executeChangeSet');

        callback();
    });

    actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id', function(err) {
        t.ifError(err, 'success');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.delete] stack does not exist', (t) => {
    AWS.stub('CloudFormation', 'deleteStack', function(params, callback) {
        var err = new Error('Stack [my-stack] does not exist');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.delete('my-stack', 'us-east-1', function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.delete] unexpected cloudformation error', (t) => {
    AWS.stub('CloudFormation', 'deleteStack', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.delete('my-stack', 'us-east-1', function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.delete] success', (t) => {
    AWS.stub('CloudFormation', 'deleteStack', function(params, callback) {
        t.deepEqual(params, { StackName: 'my-stack' }, 'deleteStack with expected params');
        callback();
    });

    actions.delete('my-stack', 'us-east-1', function(err) {
        t.ifError(err, 'success');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.validate] unexpected validateTemplate error', (t) => {
    var url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'validateTemplate', function(params, callback) {
        t.deepEqual(params, { TemplateURL: url }, 'validateTemplate with expected params');
        callback(new Error('unexpected'));
    });

    actions.validate('us-east-1', url, function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error returned');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.validate] invalid template', (t) => {
    AWS.stub('CloudFormation', 'validateTemplate', function(params, callback) {
        var err = new Error('Unresolved resource dependencies [Name] in the Outputs block of the template');
        err.code = 'ValidationError';
        callback(err);
    });

    actions.validate('us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error type');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.validate] valid template', (t) => {
    AWS.stub('CloudFormation', 'validateTemplate', function(params, callback) {
        t.deepEqual(params, {
            TemplateURL: 'https://my-bucket.s3.amazonaws.com/my-template.json'
        }, 'expected params passed to validateTemplate');

        callback();
    });

    actions.validate('us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json', function(err) {
        t.ifError(err, 'success');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.saveConfiguration] bucket does not exist', (t) => {
    var parameters = {
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

    AWS.stub('S3', 'putObject', function(params, callback) {
        var err = new Error('The specified bucket does not exist');
        err.code = 'NoSuchBucket';
        callback(err);
    });

    actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters, function(err) {
        t.ok(err instanceof actions.BucketNotFoundError, 'expected error returned');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveConfiguration] unexpected putObject error', (t) => {
    var parameters = {
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

    AWS.stub('S3', 'putObject', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters, function(err) {
        t.ok(err instanceof actions.S3Error, 'expected error returned');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveConfiguration] success with encryption', (t) => {
    var parameters = {
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

    AWS.stub('S3', 'putObject', function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-us-east-1.cfn.json',
            Body: JSON.stringify(parameters),
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: 'my-key'
        }, 'expected putObject parameters');
        callback();
    });

    actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters, 'my-key', function(err) {
        t.ifError(err, 'success');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveConfiguration] success without encryption', (t) => {
    var parameters = {
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

    AWS.stub('S3', 'putObject', function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-us-east-1.cfn.json',
            Body: JSON.stringify(parameters)
        }, 'expected putObject parameters');
        callback();
    });

    actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters, function(err) {
        t.ifError(err, 'success');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveConfiguration] config bucket in a different region', (t) => {
    var parameters = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('S3', 'getBucketLocation', function(params, callback) {
        callback(null, { LocationConstraint: 'us-east-2' });
    });

    AWS.stub('S3', 'putObject', function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-eu-west-1.cfn.json',
            Body: JSON.stringify(parameters)
        }, 'expected putObject parameters');
        callback();
    });

    actions.saveConfiguration('my-stack', 'my-stack-staging', 'eu-west-1', 'my-bucket', parameters, function(err) {
        t.ifError(err, 'success');
        t.true(AWS.S3.calledTwice, 's3 client setup called twice');
        t.ok(AWS.S3.firstCall.calledWithExactly({ signatureVersion: 'v4', region: 'eu-west-1' }), 'first s3 client created correctly');
        t.ok(AWS.S3.secondCall.calledWithExactly({ region: 'us-east-2', signatureVersion: 'v4' }), 'second s3 client created correctly');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.templateUrl] us-east-1', (t) => {
    var url = actions.templateUrl('my-bucket', 'us-east-1', 'my-stack');
    var re = /https:\/\/s3.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');
    t.end();
});

test('[actions.templateUrl] cn-north-1', (t) => {
    var url = actions.templateUrl('my-bucket', 'cn-north-1', 'my-stack');
    var re = /https:\/\/s3.cn-north-1.amazonaws.com.cn\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');
    t.end();
});

test('[actions.templateUrl] eu-central-1', (t) => {
    var url = actions.templateUrl('my-bucket', 'eu-central-1', 'my-stack');
    var re = /https:\/\/s3-eu-central-1.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');
    t.end();
});

test('[actions.saveTemplate] bucket does not exist', (t) => {
    var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
    var AWS = require('aws-sdk');
    var S3 = AWS.S3;

    AWS.S3 = function(params) {
        t.deepEqual(params, { region: 'us-east-1', signatureVersion: 'v4' });
    };
    AWS.S3.prototype.putObject = function(params, callback) {
        var err = new Error('The specified bucket does not exist');
        err.code = 'NoSuchBucket';
        callback(err);
    };

    actions.saveTemplate(url, template, function(err) {
        t.ok(err instanceof actions.BucketNotFoundError, 'expected error returned');
        AWS.S3 = S3;
        t.end();
    });
});

test('[actions.saveTemplate] s3 error', (t) => {
    var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
    AWS.stub('S3', 'putObject', function(params, callback) {
        callback(new Error('unexpected'));
    });

    actions.saveTemplate(url, template, function(err) {
        t.ok(err instanceof actions.S3Error, 'expected error returned');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveTemplate] us-east-1', (t) => {
    var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));

    // really need a way to stub the client constructor

    AWS.stub('S3', 'putObject', function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: template
        }, 'template put to expected s3 destination');

        callback();
    });

    actions.saveTemplate(url, template, function(err) {
        t.ifError(err, 'success');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveTemplate] needs whitespace removal', (t) => {
    var url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    var template = require('./fixtures/huge-template');

    AWS.stub('S3', 'putObject', function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: JSON.stringify(template)
        }, 'template put to expected s3 destination, and whitespace was removed');

        callback();
    });

    actions.saveTemplate(url, JSON.stringify(template, null, 2), function(err) {
        t.ifError(err, 'success');
        AWS.S3.restore();
        t.end();
    });
});

test('[actions.saveTemplate] cn-north-1', (t) => {
    var url = 'https://s3-cn-north-1.amazonaws.com.cn/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
    var AWS = require('aws-sdk');
    var S3 = AWS.S3;

    AWS.S3 = function(params) {
        t.deepEqual(params, { region: 'cn-north-1', signatureVersion: 'v4' }, 'parses cn-north-1 from s3 url');
    };
    AWS.S3.prototype.putObject = function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: template
        }, 'template put to expected s3 destination');
        callback();
    };

    actions.saveTemplate(url, template, function(err) {
        t.ifError(err, 'success');
        AWS.S3 = S3;
        t.end();
    });
});

test('[actions.saveTemplate] eu-central-1', (t) => {
    var url = 'https://s3-eu-central-1.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    var template = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'template.json'));
    var AWS = require('aws-sdk');
    var S3 = AWS.S3;

    AWS.S3 = function(params) {
        t.deepEqual(params, { region: 'eu-central-1', signatureVersion: 'v4' }, 'parses eu-central-1 from s3 url');
    };
    AWS.S3.prototype.putObject = function(params, callback) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: template
        }, 'template put to expected s3 destination');
        callback();
    };

    actions.saveTemplate(url, template, function(err) {
        t.ifError(err, 'success');
        AWS.S3 = S3;
        t.end();
    });
});

test('[actions.monitor] error', (t) => {
    AWS.stub('CloudFormation', 'describeStackEvents', function(params, callback) {
        callback(new Error('failure'));
        return new events.EventEmitter();
    });

    actions.monitor('my-stack', 'us-east-1', function(err) {
        t.ok(err instanceof actions.CloudFormationError, 'expected error type');
        AWS.CloudFormation.restore();
        t.end();
    });
});

test('[actions.monitor] success', (t) => {
    var once = true;

    AWS.stub('CloudFormation', 'describeStacks', function(params, callback) {
        setTimeout(callback, 1000, null, {
            Stacks: [
                { StackStatus: 'CREATE_COMPLETE' }
            ]
        });

        return new events.EventEmitter();
    });

    AWS.stub('CloudFormation', 'describeStackEvents', function(params, callback) {
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
        t.ifError(err, 'success');
        AWS.CloudFormation.restore();
        t.end();
    });
});
