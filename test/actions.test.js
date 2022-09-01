import fs from 'fs';
import events from 'events';
import test from 'tape';
import AWS from '@mapbox/mock-aws-sdk-js';
import Actions from '../lib/actions.js';
import sinon from 'sinon';

test('[actions.diff] stack does not exist', async(t) => {
    AWS.stub('CloudFormation', 'createChangeSet', () => {
        const err = new Error('Stack [my-stack] does not exist');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] invalid parameters', async(t) => {
    AWS.stub('CloudFormation', 'createChangeSet', () => {
        const err = new Error('Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] template url does not exist', async(t) => {
    AWS.stub('CloudFormation', 'createChangeSet', () => {
        const err = new Error('Template file referenced by https://my-bucket.s3.amazonaws.com/my-template.json does not exist.');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] template url is invalid', async(t) => {
    AWS.stub('CloudFormation', 'createChangeSet', () => {
        const err = new Error('The specified url must be an Amazon S3 URL.');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] template is invalid', async(t) => {
    AWS.stub('CloudFormation', 'createChangeSet', () => {
        const err = new Error('Template format error: At least one Resources member must be defined.');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] createChangeSet error on wrong changeSetType', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'createChangeSet', () => {
        const err = new Error('\'INVALID\' at \'changeSetType\' failed to satisfy constraint: Member must satisfy enum value set: [UPDATE, CREATE]');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'INVALID', url, {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] unexpected createChangeSet error', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'createChangeSet', () => {
        throw new Error('unexpected');
    });

    try {
        await  Actions.diff('my-stack', 'us-east-1', 'UPDATE', url, {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] unexpected describeChangeSet error', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'createChangeSet').returns({
        promise: () => Promise.resolve({ Id: 'changeset:arn' })
    });

    AWS.stub('CloudFormation', 'describeChangeSet', () => {
        throw new Error('unexpected');
    });

    try {
        await Actions.diff('my-stack', 'us-east-1', 'UPDATE', url, {}, false);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] changeset failed to create', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
    let changesetId;

    AWS.stub('CloudFormation', 'createChangeSet', function(params) {
        changesetId = params.ChangeSetName;
        return this.request.promise.returns(Promise.resolve({ Id: 'changeset:arn' }));
    });

    AWS.stub('CloudFormation', 'describeChangeSet').returns({
        promise: () => Promise.resolve({
            ChangeSetName: changesetId,
            ChangeSetId: 'changeset:arn',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
            StackName: 'my-stack',
            ExecutionStatus: 'UNAVAILABLE',
            Status: 'FAILED'
        })
    });

    try {
        const data = await Actions.diff('my-stack', 'us-east-1', 'UPDATE', url, {}, false);

        t.deepEqual(data, {
            id: changesetId,
            status: 'FAILED',
            execution: 'UNAVAILABLE'
        }, 'returned changeset details');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.diff] success', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
    let changesetId;
    let polled = 0;

    AWS.stub('CloudFormation', 'createChangeSet', function(params) {
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
        return this.request.promise.returns(Promise.resolve({ Id: 'changeset:arn' }));
    });

    AWS.stub('CloudFormation', 'describeChangeSet', function(params) {
        polled++;
        t.equal(params.ChangeSetName, changesetId, 'describe correct changeset');
        t.equal(params.StackName, 'my-stack', 'describe correct stackname');
        if (params.NextToken) t.equal(params.NextToken, 'xxx', 'used next token to paginate');

        if (polled === 1) {
            return this.request.promise.returns(Promise.resolve({
                ChangeSetName: changesetId,
                ChangeSetId: 'changeset:arn1',
                StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
                StackName: 'my-stack',
                ExecutionStatus: 'AVAILABLE',
                Status: 'CREATE_IN_PROGRESS',
                Changes: []
            }));
        } else if (polled === 2) {
            return this.request.promise.returns(Promise.resolve({
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
            }));
        } else if (polled === 3) {
            return this.request.promise.returns(Promise.resolve({
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
            }));
        }

        // This is a partial response object
        return this.request.promise.returns(Promise.resolve({
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
        }));
    });

    const parameters = [
        { ParameterKey: 'Name', ParameterValue: 'Chuck' },
        { ParameterKey: 'Age', ParameterValue: 18 },
        { ParameterKey: 'Handedness', ParameterValue: 'right' },
        { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
        { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
        { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
    ];

    try {
        const data = await Actions.diff('my-stack', 'us-east-1', 'UPDATE', url, parameters, true);

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
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.executeChangeSet] describeChangeSet error', async(t) => {
    AWS.stub('CloudFormation', 'describeChangeSet', () => {
        throw new Error('unexpected');
    });

    try {
        await Actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.executeChangeSet] changeset not executable', async(t) => {
    AWS.stub('CloudFormation', 'describeChangeSet').returns({
        promise: () => Promise.resolve({
            ExecutionStatus: 'UNAVAILABLE',
            Status: 'CREATE_COMPLETE',
            StatusReason: 'because I said so'
        })
    });

    try {
        await Actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.ChangeSetNotExecutableError, 'expected error');
        t.equal(err.execution, 'UNAVAILABLE', 'err object exposes execution status');
        t.equal(err.status, 'CREATE_COMPLETE', 'err object exposes status');
        t.equal(err.reason, 'because I said so', 'err object exposes status reason');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.executeChangeSet] executeChangeSet error', async(t) => {
    AWS.stub('CloudFormation', 'describeChangeSet').returns({
        promise: () => Promise.resolve({
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_COMPLETE'
        })
    });

    AWS.stub('CloudFormation', 'executeChangeSet', () => {
        throw new Error('unexpected');
    });

    try {
        await Actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id');
        t.fail();
    } catch(err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.executeChangeSet] success', async(t) => {
    AWS.stub('CloudFormation', 'describeChangeSet', function(params) {
        t.deepEqual(params, {
            ChangeSetName: 'changeset-id',
            StackName: 'my-stack',
            NextToken: undefined
        }, 'expected params provided to describeChangeSet');

        return this.request.promise.returns(Promise.resolve({
            ExecutionStatus: 'AVAILABLE',
            Status: 'CREATE_COMPLETE'
        }));
    });

    AWS.stub('CloudFormation', 'executeChangeSet', function(params) {
        t.deepEqual(params, {
            ChangeSetName: 'changeset-id',
            StackName: 'my-stack'
        }, 'expected params provided to executeChangeSet');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.executeChangeSet('my-stack', 'us-east-1', 'changeset-id');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.delete] stack does not exist', async(t) => {
    AWS.stub('CloudFormation', 'deleteStack', () => {
        const err = new Error('Stack [my-stack] does not exist');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.delete('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.delete] unexpected cloudformation error', async(t) => {
    AWS.stub('CloudFormation', 'deleteStack', () => {
        throw new Error('unexpected');
    });

    try {
        await Actions.delete('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.delete] success', async(t) => {
    AWS.stub('CloudFormation', 'deleteStack', function(params) {
        t.deepEqual(params, { StackName: 'my-stack' }, 'deleteStack with expected params');
        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.delete('my-stack', 'us-east-1');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.validate] unexpected validateTemplate error', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    AWS.stub('CloudFormation', 'validateTemplate', (params) => {
        t.deepEqual(params, { TemplateURL: url }, 'validateTemplate with expected params');
        throw new Error('unexpected');
    });

    try {
        await Actions.validate('us-east-1', url);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.validate] invalid template', async(t) => {
    AWS.stub('CloudFormation', 'validateTemplate', () => {
        const err = new Error('Unresolved resource dependencies [Name] in the Outputs block of the template');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Actions.validate('us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error type');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.validate] valid template', async(t) => {
    AWS.stub('CloudFormation', 'validateTemplate', function(params) {
        t.deepEqual(params, {
            TemplateURL: 'https://my-bucket.s3.amazonaws.com/my-template.json'
        }, 'expected params passed to validateTemplate');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.validate('us-east-1', 'https://my-bucket.s3.amazonaws.com/my-template.json');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.saveConfiguration] bucket does not exist', async(t) => {
    const parameters = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'putObject', () => {
        const err = new Error('The specified bucket does not exist');
        err.code = 'NoSuchBucket';
        throw err;
    });

    try {
        await Actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.BucketNotFoundError, 'expected error returned');
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveConfiguration] unexpected putObject error', async(t) => {
    const parameters = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'putObject', () => {
        throw new Error('unexpected');
    });

    try {
        await Actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.S3Error, 'expected error returned');
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveConfiguration] success with encryption', async(t) => {
    const parameters = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'putObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-us-east-1.cfn.json',
            Body: JSON.stringify(parameters),
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: 'my-key'
        }, 'expected putObject parameters');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters, 'my-key');
    } catch (err) {
        t.error(err);
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveConfiguration] success without encryption', async(t) => {
    const parameters = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'putObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-us-east-1.cfn.json',
            Body: JSON.stringify(parameters)
        }, 'expected putObject parameters');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.saveConfiguration('my-stack', 'my-stack-staging', 'us-east-1', 'my-bucket', parameters);
    } catch (err) {
        t.error(err);
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveConfiguration] config bucket in a different region', async(t) => {
    const parameters = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve({ LocationConstraint: 'us-east-2' })
    });

    AWS.stub('S3', 'putObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-eu-west-1.cfn.json',
            Body: JSON.stringify(parameters)
        }, 'expected putObject parameters');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.saveConfiguration('my-stack', 'my-stack-staging', 'eu-west-1', 'my-bucket', parameters);

        t.true(AWS.S3.calledTwice, 's3 client setup called twice');
        t.ok(AWS.S3.firstCall.calledWithExactly({ signatureVersion: 'v4', region: 'eu-west-1' }), 'first s3 client created correctly');
        t.ok(AWS.S3.secondCall.calledWithExactly({ region: 'us-east-2', signatureVersion: 'v4' }), 'second s3 client created correctly');
    } catch (err) {
        t.error(err);
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.templateUrl] us-east-1', (t) => {
    const url = Actions.templateUrl('my-bucket', 'us-east-1', 'my-stack');
    const re = /https:\/\/s3.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');
    t.end();
});

test('[actions.templateUrl] cn-north-1', (t) => {
    const url = Actions.templateUrl('my-bucket', 'cn-north-1', 'my-stack');
    const re = /https:\/\/s3.cn-north-1.amazonaws.com.cn\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');
    t.end();
});

test('[actions.templateUrl] eu-central-1', (t) => {
    const url = Actions.templateUrl('my-bucket', 'eu-central-1', 'my-stack');
    const re = /https:\/\/s3-eu-central-1.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');
    t.end();
});

test('[actions.saveTemplate] bucket does not exist', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = fs.readFileSync(new URL('./fixtures/template.json', import.meta.url));
    const AWS = (await import('aws-sdk')).default;
    const S3 = AWS.S3;

    AWS.S3 = function(params) {
        t.deepEqual(params, { region: 'us-east-1', signatureVersion: 'v4' });
    };

    AWS.S3.prototype.putObject = () => {
        const err = new Error('The specified bucket does not exist');
        err.code = 'NoSuchBucket';
        throw err;
    };

    try {
        await Actions.saveTemplate(url, template);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.BucketNotFoundError, 'expected error returned');
    }

    AWS.S3 = S3;
    t.end();
});

test('[actions.saveTemplate] s3 error', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = fs.readFileSync(new URL('./fixtures/template.json', import.meta.url));
    AWS.stub('S3', 'putObject', () => {
        throw new Error('unexpected');
    });

    try {
        await Actions.saveTemplate(url, template);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.S3Error, 'expected error returned');
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveTemplate] us-east-1', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = fs.readFileSync(new URL('./fixtures/template.json', import.meta.url));

    // really need a way to stub the client constructor

    AWS.stub('S3', 'putObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: template
        }, 'template put to expected s3 destination');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.saveTemplate(url, template);
    } catch (err) {
        t.error(err);
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveTemplate] needs whitespace removal', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = (await import('./fixtures/huge-template.js')).default

    AWS.stub('S3', 'putObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: JSON.stringify(template)
        }, 'template put to expected s3 destination, and whitespace was removed');

        return this.request.promise.returns(Promise.resolve());
    });

    try {
        await Actions.saveTemplate(url, JSON.stringify(template, null, 2));
    } catch (err) {
        t.error(err);
    }

    AWS.S3.restore();
    t.end();
});

test('[actions.saveTemplate] cn-north-1', async(t) => {
    const url = 'https://s3-cn-north-1.amazonaws.com.cn/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = fs.readFileSync(new URL('./fixtures/template.json', import.meta.url));
    const AWS = (await import('aws-sdk')).default;
    const S3 = AWS.S3;

    AWS.S3 = function(params) {
        t.deepEqual(params, { region: 'cn-north-1', signatureVersion: 'v4' }, 'parses cn-north-1 from s3 url');
    };

    AWS.S3.prototype.putObject = function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: template
        }, 'template put to expected s3 destination');

        return {
            promise: () => Promise.resolve()
        };
    };

    try {
        await Actions.saveTemplate(url, template);
    } catch (err) {
        t.error(err);
    }

    AWS.S3 = S3;
    t.end();
});

test('[actions.saveTemplate] eu-central-1', async(t) => {
    const url = 'https://s3-eu-central-1.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = fs.readFileSync(new URL('./fixtures/template.json', import.meta.url));
    const AWS = (await import('aws-sdk')).default;

    const S3 = AWS.S3;

    AWS.S3 = function(params) {
        t.deepEqual(params, { region: 'eu-central-1', signatureVersion: 'v4' }, 'parses eu-central-1 from s3 url');
    };
    AWS.S3.prototype.putObject = function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
            Body: template
        }, 'template put to expected s3 destination');
        return {
            promise: () => Promise.resolve()
        };
    };

    try {
        await Actions.saveTemplate(url, template);
    } catch (err) {
        t.error(err);
    }

    AWS.S3 = S3;
    t.end();
});

test('[actions.monitor] error', async(t) => {
    AWS.stub('CloudFormation', 'describeStackEvents', () => {
        throw new Error('failure');
    });

    try {
        await Actions.monitor('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error type');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[actions.monitor] success', async(t) => {
    let once = true;

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

    try {
        await Actions.monitor('my-stack', 'us-east-1');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});
