import fs from 'fs';
import events from 'events';
import test from 'tape';
import Sinon from 'sinon';
import Actions from '../lib/actions.js';
import {
    CloudFormationClient,
    DescribeChangeSetCommand,
    CreateChangeSetCommand,
    DeleteStackCommand,
    ValidateTemplateCommand,
    ExecuteChangeSetCommand,
    DescribeStackEventsCommand

} from '@aws-sdk/client-cloudformation';
import S3 from '@aws-sdk/client-s3';

test('[actions.cancel] stack does not exist', async (t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('Stack [my-stack] does not exist'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.cancel('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'Stack [my-stack] does not exist');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] stack does not exist', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('Stack [my-stack] does not exist'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'Stack [my-stack] does not exist');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] invalid parameters', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'Parameters: [Pets, Age, Name, LuckyNumbers, SecretPassword] must have values');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] template url does not exist', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('Template file referenced by https://my-bucket.s3.amazonaws.com/my-template.json does not exist.'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'Template file referenced by https://my-bucket.s3.amazonaws.com/my-template.json does not exist.');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] template url is invalid', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('The specified url must be an Amazon S3 URL.'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'The specified url must be an Amazon S3 URL.');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] template is invalid', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('Template format error: At least one Resources member must be defined.'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'UPDATE', 'https://my-bucket.s3.amazonaws.com/my-template.json', [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'Template format error: At least one Resources member must be defined.');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] createChangeSet error on wrong changeSetType', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('\'INVALID\' at \'changeSetType\' failed to satisfy constraint: Member must satisfy enum value set: [UPDATE, CREATE]'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'INVALID', url, [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message ,'\'INVALID\' at \'changeSetType\' failed to satisfy constraint: Member must satisfy enum value set: [UPDATE, CREATE]');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] unexpected createChangeSet error', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake(() => {
        return Promise.reject(new Error('unexpected'));
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
        await actions.diff('my-stack', 'UPDATE', url, [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
        t.equals(err.message, 'unexpected');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] unexpected describeChangeSet error', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CreateChangeSetCommand) {
            return Promise.resolve({ Id: 'changeset:arn' })
        } else if (command instanceof DescribeChangeSetCommand) {
            return Promise.reject(new Error('unexpected'));
        } else {
            return Promise.reject(new Error('Test Error - Unexpected Command'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.diff('my-stack', 'UPDATE', url, [], []);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] changeset failed to create', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CreateChangeSetCommand) {
            return Promise.resolve({ Id: 'changeset:arn' });
        } else if (command instanceof DescribeChangeSetCommand) {
            return Promise.resolve({
                ChangeSetName: '123',
                ChangeSetId: 'changeset:arn',
                StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
                StackName: 'my-stack',
                ExecutionStatus: 'UNAVAILABLE',
                Status: 'FAILED'
            });
        } else {
            return Promise.reject(new Error('Test Error - Unexpected Command'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        const data = await actions.diff('my-stack', 'UPDATE', url, [], []);

        t.deepEqual(data, {
            id: '123',
            status: 'FAILED',
            execution: 'UNAVAILABLE',
            changes: []
        }, 'returned changeset details');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.diff] success', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';
    let changesetId: string;
    let polled = 0;

    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CreateChangeSetCommand) {
            t.ok(/^[\w\d-]{1,128}$/.test(command.input.ChangeSetName), 'createChangeSet valid change set name');
            t.deepEqual(command.input, {
                ChangeSetName: command.input.ChangeSetName,
                ChangeSetType: 'UPDATE',
                StackName: 'my-stack',
                Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
                Parameters: [
                    { ParameterKey: 'Name', ParameterValue: 'Chuck' },
                    { ParameterKey: 'Age', ParameterValue: '18' },
                    { ParameterKey: 'Handedness', ParameterValue: 'right' },
                    { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
                    { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
                    { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
                ],
                TemplateURL: url,
                Tags: [{
                    Key: 'developer',
                    Value: 'ingalls'
                }]
            }, 'createChangeSet expected parameters');

            changesetId = command.input.ChangeSetName;
            return Promise.resolve({ Id: 'changeset:arn' });
        } else if (command instanceof DescribeChangeSetCommand) {
            polled++;
            t.equal(command.input.ChangeSetName, changesetId, 'describe correct changeset');
            t.equal(command.input.StackName, 'my-stack', 'describe correct stackname');
            if (command.input.NextToken) t.equal(command.input.NextToken, 'xxx', 'used next token to paginate');

            if (polled === 1) {
                return Promise.resolve({
                    ChangeSetName: changesetId,
                    ChangeSetId: 'changeset:arn1',
                    StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
                    StackName: 'my-stack',
                    ExecutionStatus: 'AVAILABLE',
                    Status: 'CREATE_IN_PROGRESS',
                    Changes: []
                });
            } else if (polled === 2) {
                return Promise.resolve({
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
            } else if (polled === 3) {
                return Promise.resolve({
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
            }

            // This is a partial response object
            return Promise.resolve({
                ChangeSetName: 'aa507e2bdfc55947035a07271e75384efe',
                ChangeSetId: 'changeset:arn',
                StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/be3aa370-5b64-11e6-a232-500c217dbe62',
                StackName: 'my-stack',
                ExecutionStatus: 'AVAILABLE',
                Status: 'CREATE_COMPLETE',
                Changes: [{
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Modify',
                        LogicalResourceId: 'Topic',
                        PhysicalResourceId: 'arn:aws:sns:us-east-1:123456789012:my-stack-Topic-DQ8MBRPFONMK',
                        ResourceType: 'AWS::SNS::Topic',
                        Replacement: 'False'
                    }
                }]
            });
        }
    });

    const parameters = [
        { ParameterKey: 'Name', ParameterValue: 'Chuck' },
        { ParameterKey: 'Age', ParameterValue: '18' },
        { ParameterKey: 'Handedness', ParameterValue: 'right' },
        { ParameterKey: 'Pets', ParameterValue: 'Duck,Wombat' },
        { ParameterKey: 'LuckyNumbers', ParameterValue: '3,7,42' },
        { ParameterKey: 'SecretPassword', ParameterValue: 'secret' }
    ];

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        const data = await actions.diff('my-stack', 'UPDATE', url, parameters, [{
            Key: 'developer',
            Value: 'ingalls'
        }], true);

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

    Sinon.restore();
    t.end();
});

test('[actions.executeChangeSet] describeChangeSet error', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DescribeChangeSetCommand) {
            return Promise.reject(new Error('unexpected'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.executeChangeSet('my-stack', 'changeset-id');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error');
    }

    Sinon.restore();
    t.end();
});

test('[actions.executeChangeSet] changeset not executable', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DescribeChangeSetCommand) {
            return Promise.resolve({
                ExecutionStatus: 'UNAVAILABLE',
                Status: 'CREATE_COMPLETE',
                StatusReason: 'because I said so'
            })
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.executeChangeSet('my-stack', 'changeset-id');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.ChangeSetNotExecutableError, 'expected error');
        t.equal(err.execution, 'UNAVAILABLE', 'err object exposes execution status');
        t.equal(err.status, 'CREATE_COMPLETE', 'err object exposes status');
        t.equal(err.reason, 'because I said so', 'err object exposes status reason');
    }

    Sinon.restore();
    t.end();
});

test('[actions.executeChangeSet] executeChangeSet error', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DescribeChangeSetCommand) {
            return Promise.resolve({
                ExecutionStatus: 'AVAILABLE',
                Status: 'CREATE_COMPLETE'
            })
        } else if (command instanceof ExecuteChangeSetCommand) {
            return Promise.reject(new Error('unexpected'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.executeChangeSet('my-stack', 'changeset-id');
        t.fail();
    } catch(err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error');
    }

    Sinon.restore();
    t.end();
});

test('[actions.executeChangeSet] success', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DescribeChangeSetCommand) {
            t.deepEqual(command.input, {
                ChangeSetName: 'changeset-id',
                StackName: 'my-stack',
                NextToken: undefined
            }, 'expected params provided to describeChangeSet');

            return Promise.resolve({
                ExecutionStatus: 'AVAILABLE',
                Status: 'CREATE_COMPLETE'
            })
        } else if (command instanceof ExecuteChangeSetCommand) {
            t.deepEqual(command.input, {
                ChangeSetName: 'changeset-id',
                StackName: 'my-stack'
            }, 'expected params provided to executeChangeSet');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.executeChangeSet('my-stack', 'changeset-id');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.delete] stack does not exist', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DeleteStackCommand) {
            const err: any = new Error('Stack [my-stack] does not exist');
            err.code = 'ValidationError';
            throw err;
            return Promise.reject(err);
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.delete('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});


test('[actions.delete] unexpected cloudformation error', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DeleteStackCommand) {
            return Promise.reject(new Error('unexpected'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.delete('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.delete] success', async (t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DeleteStackCommand) {
            t.deepEqual(command.input, { StackName: 'my-stack' }, 'deleteStack with expected params');
            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.delete('my-stack');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.validate] unexpected validateTemplate error', async(t) => {
    const url = 'https://my-bucket.s3.amazonaws.com/my-template.json';

    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof ValidateTemplateCommand) {
            t.deepEqual(command.input, { TemplateURL: url }, 'validateTemplate with expected params');
            return Promise.reject(new Error('unexpected'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.validate(url);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.validate] invalid template', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof ValidateTemplateCommand) {
            const err: any = new Error('Unresolved resource dependencies [Name] in the Outputs block of the template');
            err.code = 'ValidationError';
            return Promise.reject(err);
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.validate('https://my-bucket.s3.amazonaws.com/my-template.json');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error type');
    }

    Sinon.restore();
    t.end();
});

test('[actions.validate] valid template', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof ValidateTemplateCommand) {
            t.deepEqual(command.input, {
                TemplateURL: 'https://my-bucket.s3.amazonaws.com/my-template.json'
            }, 'expected params passed to validateTemplate');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.validate('https://my-bucket.s3.amazonaws.com/my-template.json');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveConfiguration] bucket does not exist', async(t) => {
    const parameters: Map<string, string> = new Map([
        ['Name', 'Chuck'],
        ['Age', '18'],
        ['Handedness', 'left'],
        ['Pets', 'Duck,Wombat'],
        ['LuckyNumbers', '3,7,42'],
        ['SecretPassword', 'secret']
    ]);

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-1')
        } else if (command instanceof S3.PutObjectCommand) {
            const err: any = new Error('The specified bucket does not exist');
            err.code = 'NoSuchBucket';
            return Promise.reject(err);
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveConfiguration('my-stack', 'my-stack-staging', 'my-bucket', parameters);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.BucketNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveConfiguration] unexpected putObject error', async(t) => {
    const parameters: Map<string, string> = new Map([
        ['Name', 'Chuck'],
        ['Age', '18'],
        ['Handedness', 'left'],
        ['Pets', 'Duck,Wombat'],
        ['LuckyNumbers', '3,7,42'],
        ['SecretPassword', 'secret']
    ]);

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-1')
        } else if (command instanceof S3.PutObjectCommand) {
            return Promise.reject(new Error('unexpected'));
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveConfiguration('my-stack', 'my-stack-staging', 'my-bucket', parameters);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.S3Error, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveConfiguration] success', async(t) => {
    const parameters: Map<string, string> = new Map([
        ['Name', 'Chuck'],
        ['Age', '18'],
        ['Handedness', 'left'],
        ['Pets', 'Duck,Wombat'],
        ['LuckyNumbers', '3,7,42'],
        ['SecretPassword', 'secret']
    ]);

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-1')
        } else if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'my-stack/my-stack-staging-us-east-1.cfn.json',
                Body: JSON.stringify(Object.fromEntries(parameters)),
            }, 'expected putObject parameters');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveConfiguration('my-stack', 'my-stack-staging-us-east-1', 'my-bucket', parameters);
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveConfiguration] success without encryption', async(t) => {
    const parameters: Map<string, string> = new Map([
        ['Name', 'Chuck'],
        ['Age', '18'],
        ['Handedness', 'left'],
        ['Pets', 'Duck,Wombat'],
        ['LuckyNumbers', '3,7,42'],
        ['SecretPassword', 'secret']
    ]);

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-1')
        } else if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'my-stack/my-stack-staging-us-east-1.cfn.json',
                Body: JSON.stringify(Object.fromEntries(parameters))
            }, 'expected putObject parameters');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveConfiguration('my-stack', 'my-stack-staging-us-east-1', 'my-bucket', parameters);
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveConfiguration] config bucket in a different region', async(t) => {
    const parameters: Map<string, string> = new Map([
        ['Name', 'Chuck'],
        ['Age', '18'],
        ['Handedness', 'left'],
        ['Pets', 'Duck,Wombat'],
        ['LuckyNumbers', '3,7,42'],
        ['SecretPassword', 'secret']
    ]);

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-2')
        } else if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'my-stack/my-stack-staging-eu-west-1.cfn.json',
                Body: JSON.stringify(Object.fromEntries(parameters))
            }, 'expected putObject parameters');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'eu-west-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveConfiguration('my-stack', 'my-stack-staging-eu-west-1', 'my-bucket', parameters);
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.templateUrl] us-east-1', async (t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-2')
        }
    });

    const actions = new Actions({
        region: 'us-east-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });
    const url = await actions.templateUrl('my-bucket', 'my-stack');
    const re = /https:\/\/s3.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');

    Sinon.restore();
    t.end();
});

test('[actions.templateUrl] cn-north-1', async (t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve({
                LocationConstraint: 'cn-north-1'
            })
        }
    });

    const actions = new Actions({
        region: 'cn-north-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });
    const url = await actions.templateUrl('my-bucket', 'my-stack');
    const re = /https:\/\/s3.cn-north-1.amazonaws.com.cn\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');

    Sinon.restore()
    t.end();
});

test('[actions.templateUrl] eu-central-1', async (t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve({
                LocationConstraint: 'eu-central-1'
            })
        }
    });
    const actions = new Actions({
        region: 'eu-central-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    const url = await actions.templateUrl('my-bucket', 'my-stack');
    const re = /https:\/\/s3-eu-central-1.amazonaws.com\/my-bucket\/.*-my-stack.template.json/;
    t.ok(re.test(url), 'expected url');

    Sinon.restore();
    t.end();
});

test('[actions.saveTemplate] bucket does not exist', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url)));

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.PutObjectCommand) {
            const err: any = new Error('The specified bucket does not exist');
            err.code = 'NoSuchBucket';
            return Promise.reject(err);
        }
    });
    const actions = new Actions({
        region: 'eu-central-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveTemplate(url, template);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.BucketNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveTemplate] s3 error', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url)));

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.PutObjectCommand) {
            return Promise.reject(new Error('unexpected'));
        }
    });
    const actions = new Actions({
        region: 'eu-central-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveTemplate(url, template);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.S3Error, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveTemplate] us-east-1', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url)));

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
                Body: template
            }, 'template put to expected s3 destination');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'eu-central-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveTemplate(url, template);
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveTemplate] needs whitespace removal', async(t) => {
    const url = 'https://s3.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    // @ts-ignore
    const template = (await import('./fixtures/huge-template.js')).default;

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
                Body: JSON.stringify(template)
            }, 'template put to expected s3 destination, and whitespace was removed');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'eu-central-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveTemplate(url, JSON.stringify(template, null, 2));
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveTemplate] cn-north-1', async(t) => {
    const url = 'https://s3-cn-north-1.amazonaws.com.cn/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url)));

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
                Body: template
            }, 'template put to expected s3 destination');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'cn-north-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveTemplate(url, template);
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.saveTemplate] eu-central-1', async(t) => {
    const url = 'https://s3-eu-central-1.amazonaws.com/my-bucket/cirjpj94c0000s5nzc1j452o7-my-stack.template.json';
    const template = String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url)));

    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.PutObjectCommand) {
            t.deepEqual(command.input, {
                Bucket: 'my-bucket',
                Key: 'cirjpj94c0000s5nzc1j452o7-my-stack.template.json',
                Body: template
            }, 'template put to expected s3 destination');

            return Promise.resolve();
        }
    });

    const actions = new Actions({
        region: 'eu-central-1',
        credentials: {
            accessKeyId: '123',
            secretAccessKey: '321'
        }
    });

    try {
        await actions.saveTemplate(url, template);
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[actions.monitor] error', async(t) => {
    Sinon.stub(CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof DescribeStackEventsCommand) {
            return Promise.reject(new Error('failure'));
        }
    });

    try {
        const actions = new Actions({
            region: 'us-east-1',
            credentials: {
                accessKeyId: '123',
                secretAccessKey: '321'
            }
        });

        await actions.monitor('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Actions.CloudFormationError, 'expected error type');
    }

    Sinon.restore();
    t.end();
});
