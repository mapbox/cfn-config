import fs from 'fs';
import test from 'tape';
import Lookup from '../lib/lookup.js';
import CloudFormation from '@aws-sdk/client-cloudformation';
import S3 from '@aws-sdk/client-s3';
import Sinon from 'sinon';

const template = JSON.parse(String(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url))));

test('[lookup.info] describeStacks error', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.reject(new Error('cloudformation failed'));
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })

        await lookup.info('my-stack');

        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.info] stack does not exist', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            const err: any = new Error('Stack with id my-stack does not exist');
            err.code = 'ValidationError';
            return Promise.reject(err);
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })

        await lookup.info('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.info] stack info not returned', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.resolve({
                Stacks: []
            });
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })

        await lookup.info('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.info] success', async(t) => {
    const date = new Date();

    const stackInfo = {
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
        Outputs: [{
            OutputKey: 'Blah',
            OutputValue: 'blah',
            Description: 'nothing'
        }],
        Tags: [{
            Key: 'Category',
            Value: 'Peeps'
        }]
    };

    const expected = {
        StackId: 'stack-id',
        StackName: 'my-stack',
        Description: 'test-stack',
        Parameters: new Map<string, any>([
            ['Name', 'Chuck'],
            ['Age', 18],
            ['Handedness', 'left'],
            ['Pets', 'Duck,Wombat'],
            ['LuckyNumbers', '3,7,42'],
            ['SecretPassword', 'secret']
        ]),
        CreationTime: date,
        LastUpdatedTime: date,
        StackStatus: 'CREATE_COMPLETE',
        DisableRollback: false,
        NotificationARNs: ['some-arn'],
        TimeoutInMinutes: 10,
        Capabilities: 'CAPABILITY_IAM',
        Outputs: new Map([['Blah', 'blah' ]]),
        Tags: new Map([['Category', 'Peeps']]),
        Region: 'us-east-1',
    };

    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.resolve({
                Stacks: [stackInfo]
            });
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const info = await lookup.info('my-stack');
        t.deepEqual(info, expected, 'expected info returned');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.info] with resources', async(t) => {
    const stack = [
        { StackResourceSummaries: [{ resource1: 'ohai' }], NextToken: '1' },
        { StackResourceSummaries: [{ resource2: 'ohai' }], NextToken: null }
    ].reverse();

    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.resolve({
                Stacks: [{}]
            });
        } else if (command instanceof CloudFormation.ListStackResourcesCommand) {
            return Promise.resolve(stack.pop())
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })

        const info = await lookup.info('my-stack', true);

        t.deepEqual(info.StackResources, [
            { resource1: 'ohai' },
            { resource2: 'ohai' }
        ], 'added stack resources');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.info] resource lookup failure', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.resolve({
                Stacks: [{}]
            });
        } else if (command instanceof CloudFormation.ListStackResourcesCommand) {
            return Promise.reject(new Error('failure'));
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })

        await lookup.info('my-stack', true);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.parameters] lookup.info error', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.resolve({ Stacks: [] });
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })

        await lookup.parameters('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.parameters] success', async(t) => {
    const stackInfo = {
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
        Outputs: [{
            OutputKey: 'Blah',
            OutputValue: 'blah',
            Description: 'nothing'
        }],
        Tags: [{
            Key: 'Category',
            Value: 'Peeps'
        }]
    };

    const expected = new Map<string, any>([
        ['Name', 'Chuck'],
        ['Age', 18],
        ['Handedness', 'left'],
        ['Pets', 'Duck,Wombat'],
        ['LuckyNumbers', '3,7,42'],
        ['SecretPassword', 'secret']
    ]);

    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.DescribeStacksCommand) {
            return Promise.resolve({ Stacks: [stackInfo] });
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const info = await lookup.parameters('my-stack');
        t.deepEqual(info, expected, 'expected parameters returned');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.template] getTemplate error', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.GetTemplateCommand) {
            return Promise.reject(new Error('cloudformation failed'));
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await lookup.template('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.template] stack does not exist', async(t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.GetTemplateCommand) {
            const err: any = new Error('Stack with id my-stack does not exist');
            err.code = 'ValidationError';
            return Promise.reject(err);
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await lookup.template('my-stack');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.template] success', async (t) => {
    Sinon.stub(CloudFormation.CloudFormationClient.prototype, 'send').callsFake((command) => {
        if (command instanceof CloudFormation.GetTemplateCommand) {
            t.deepEqual(command.input, {
                StackName: 'my-stack',
                TemplateStage: 'Original'
            }, 'getTemplate call sets the TemplateStage');

            return Promise.resolve({
                RequestMetadata: { RequestId: 'db317457-46f2-11e6-8ee0-fbc06d2d1322' },
                TemplateBody: JSON.stringify(template)
            });
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        const body = await lookup.template('my-stack');
        t.deepEqual(body.body, template, 'expected template body returned');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configurations] bucket location error', async(t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.reject(new Error('failure'));
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await lookup.configurations('my-stack', 'my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.S3Error, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configurations] bucket does not exist', async(t) => {
    Sinon.stub(S3.S3Client.prototype, 'send').callsFake((command) => {
        if (command instanceof S3.GetBucketLocationCommand) {
            return Promise.resolve('us-east-1')
        } else if (command instanceof S3.ListObjectsCommand) {
            const err: any = new Error('The specified bucket does not exist');
            err.code = 'NoSuchBucket';
            return Promise.reject(err);
        }
    });

    try {
        const lookup = new Lookup({
            region: 'us-east-1',
            credentials: { accessKeyId: '-', secretAccessKey: '-' }
        })
        await lookup.configurations('my-stack', 'my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

/*
test('[lookup.configurations] S3 error', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'listObjects', (params) => {
        t.equal(params.Prefix, 'my-stack/', 'listObjects called with proper prefix');
        throw new Error('something unexpected');
    });

    try {
        await Lookup.configurations('my-stack', 'my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.S3Error, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configurations] no saved configs found', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'listObjects').returns({
        promise: () => Promise.resolve({ Contents: [] })
    });

    try {
        const configs = await Lookup.configurations('my-stack', 'my-bucket');
        t.deepEqual(configs, [], 'expected empty array of configs');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configurations] found multiple saved configs', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'listObjects').returns({
        promise: () => Promise.resolve({
            Contents: [
                { Key: 'my-stack/staging.cfn.json', Size: 10 },
                { Key: 'my-stack/production.cfn.json', Size: 10 },
                { Key: 'my-stack/something-else', Size: 10 },
                { Key: 'my-stack/folder', Size: 0 }
            ]
        })
    });

    try {
        const configs = await Lookup.configurations('my-stack', 'my-bucket');
        t.deepEqual(configs, [
            'staging',
            'production'
        ], 'expected array of configs');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configurations] region specified', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'listObjects').returns({
        promise: () => Promise.resolve({ Contents: [] })
    });

    try {
        await Lookup.configurations('my-stack', 'my-bucket', 'cn-north-1');

        t.ok(AWS.S3.calledWith({
            signatureVersion: 'v4',
            region: 'cn-north-1'
        }), 'created S3 client in requested region');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configuration] bucket location error', async(t) => {
    AWS.stub('S3', 'getBucketLocation').yields(new Error('failure'));

    try {
        await Lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.S3Error, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configuration] bucket does not exist', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'getObject', () => {
        const err = new Error('The specified bucket does not exist');
        err.code = 'NoSuchBucket';
        throw err;
    });

    try {
        await Lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configuration] S3 error', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'getObject', (params) => {
        t.equal(params.Key, 'my-stack/my-stack-staging-us-east-1.cfn.json', 'getObject called with proper key');
        throw new Error('something unexpected');
    });

    try {
        await Lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.S3Error, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configuration] requested configuration does not exist', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'getObject', () => {
        const err = new Error('The specified key does not exist.');
        err.code = 'NoSuchKey';
        throw err;
    });

    try {
        await Lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.ConfigurationNotFoundError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configuration] cannot parse object data', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'getObject').returns({
        promise: () => Promise.resolve({ Body: new Buffer.from('invalid') })
    });

    try {
        await Lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.InvalidConfigurationError, 'expected error returned');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.configuration] success', async(t) => {
    const info = {
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

    AWS.stub('S3', 'getObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-stack/my-stack-staging-us-east-1.cfn.json'
        }, 'requested expected configuration');

        return this.request.promise.returns(Promise.resolve({ Body: new Buffer.from(JSON.stringify(info)) }));
    });

    try {
        const configuration = await Lookup.configuration('my-stack', 'my-bucket', 'my-stack-staging-us-east-1');
        t.deepEqual(configuration, info, 'returned expected stack info');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.defaultConfiguration] bucket location error', async(t) => {
    AWS.stub('S3', 'getBucketLocation').yields(new Error('failure'));

    try {
        const info = await Lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json');
        t.deepEqual(info, {}, 'provided blank info');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.defaultConfiguration] requested configuration does not exist', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'getObject', () =>  {
        const err = new Error('The specified key does not exist.');
        err.code = 'NoSuchKey';
        throw err;
    });

    try {
        const info = await Lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json');
        t.deepEqual(info, {}, 'provided blank info');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.defaultConfiguration] cannot parse object data', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'getObject').returns({
        promise: () => Promise.resolve({ Body: new Buffer.from('invalid') })
    });

    try {
        const info = await Lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json');
        t.deepEqual(info, {}, 'provided blank info');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.defaultConfiguration] success', async(t) => {
    const info = {
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

    AWS.stub('S3', 'getObject', function(params) {
        t.deepEqual(params, {
            Bucket: 'my-bucket',
            Key: 'my-config.cfn.json'
        }, 'requested expected default configuration');

        return this.request.promise.returns(Promise.resolve({ Body: new Buffer.from(JSON.stringify(info)) }));
    });

    try {
        const configuration = await Lookup.defaultConfiguration('s3://my-bucket/my-config.cfn.json');
        t.deepEqual(configuration, info, 'returned expected stack info');
    } catch (err) {
        t.error(err);
    }

    Sinon.restore();
    t.end();
});

test('[lookup.bucketRegion] no bucket', async(t) => {
    AWS.stub('S3', 'getBucketLocation', () => {
        const err = new Error('failure');
        err.code = 'NoSuchBucket';
        throw err;
    });

    try {
        await Lookup.bucketRegion('my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error type');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.bucketRegion] failure', async(t) => {
    AWS.stub('S3', 'getBucketLocation').yields(new Error('failure'));

    try {
        await Lookup.bucketRegion('my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.S3Error, 'expected error type');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.bucketRegion] no bucket', async(t) => {
    AWS.stub('S3', 'getBucketLocation', () => {
        const err = new Error('failure');
        err.code = 'NoSuchBucket';
        throw err;
    });

    try {
        await Lookup.bucketRegion('my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error type');
    }

    Sinon.restore();
    t.end();
});

test('[lookup.bucketRegion] region specified', async(t) => {
    AWS.stub('S3', 'getBucketLocation', () => {
        const err = new Error('failure');
        err.code = 'NoSuchBucket';
        throw err;
    });

    try {
        await Lookup.bucketRegion('my-bucket', 'cn-north-1');

        t.ok(AWS.S3.calledWith({
            signatureVersion: 'v4',
            region: 'cn-north-1'
        }), 'used region in S3 client configuration');
    } catch (err) {
        t.error();
    }

    Sinon.restore();
    t.end();
});
*/
