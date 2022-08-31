import fs from 'fs';
import test from 'tape';
import Lookup from '../lib/lookup.js';
import AWS from '@mapbox/mock-aws-sdk-js';

const template = JSON.parse(fs.readFileSync(new URL('./fixtures/template.json', import.meta.url)));

test('[lookup.info] describeStacks error', async(t) => {
    AWS.stub('CloudFormation', 'describeStacks').yields(new Error('cloudformation failed'));

    try {
        await Lookup.info('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.info] stack does not exist', async(t) => {
    AWS.stub('CloudFormation', 'describeStacks', () => {
        const err = new Error('Stack with id my-stack does not exist');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Lookup.info('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.info] stack info not returned', async(t) => {
    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [] })
    });

    try {
        await Lookup.info('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
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

    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [stackInfo] })
    });

    try {
        const info = await Lookup.info('my-stack', 'us-east-1');
        t.deepEqual(info, expected, 'expected info returned');
    } catch (err) {
        t.error(err);
    }
    AWS.CloudFormation.restore();
    t.end();
});

test.test('[lookup.info] with resources', async(t) => {
    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [{}] })
    });

    const stack = [
        { StackResourceSummaries: [{ resource1: 'ohai' }], NextToken: '1' },
        { StackResourceSummaries: [{ resource2: 'ohai' }], NextToken: null }
    ].reverse();

    AWS.stub('CloudFormation', 'listStackResources').returns({
        promise: () => Promise.resolve(stack.pop())
    });

    try {
        const info = await Lookup.info('my-stack', 'us-east-1', true);

        t.deepEqual(info.StackResources, [
            { resource1: 'ohai' },
            { resource2: 'ohai' }
        ], 'added stack resources');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test.test('[lookup.info] resource lookup failure', async(t) => {
    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [{}] })
    });

    AWS.stub('CloudFormation', 'listStackResources').returns({
        eachPage: (callback) => {
            callback(null, { StackResourceSummaries: [{ resource1: 'ohai' }] }, () => {
                callback(new Error('failure'), null);
            });
        }
    });

    try {
        await Lookup.info('my-stack', 'us-east-1', true);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.parameters] lookup.info error', async(t) => {
    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [] })
    });

    try {
        await Lookup.parameters('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.info] secure', async(t) => {
    const date = new Date();

    const stackInfo = {
        StackId: 'stack-id',
        StackName: 'my-stack',
        Description: 'test-stack',
        Parameters: [
            { ParameterKey: 'PlainText', ParameterValue: 'Hello world!' },
            { ParameterKey: 'SecureVarA', ParameterValue: 'secure:' + (new Buffer.from('EncryptedValue1')).toString('base64') },
            { ParameterKey: 'SecureVarB', ParameterValue: 'secure:' + (new Buffer.from('EncryptedValue2')).toString('base64') }
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

    const expected = {
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

    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [stackInfo] })
    });

    AWS.stub('KMS', 'decrypt', function(params) {
        const encrypted = new Buffer.from(params.CiphertextBlob, 'base64').toString('utf8');

        if (encrypted === 'EncryptedValue1') {
            return this.request.promise.returns(Promise.resolve({ Plaintext: (new Buffer.from('DecryptedValue1')).toString('base64') }));
        } else if (encrypted === 'EncryptedValue2') {
            return this.request.promise.returns(Promise.resolve({ Plaintext: (new Buffer.from('DecryptedValue2')).toString('base64') }));
        }
        t.fail('Unrecognized encrypted value ' + encrypted);
    });

    try {
        const info = await Lookup.info('my-stack', 'us-east-1', false, true);
        t.deepEqual(info, expected, 'expected info returned');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    AWS.KMS.restore();
    t.end();
});

test('[lookup.info] secure error', async(t) => {
    const stackInfo = {
        StackId: 'stack-id',
        StackName: 'my-stack',
        Description: 'test-stack',
        Parameters: [
            { ParameterKey: 'PlainText', ParameterValue: 'Hello world!' },
            { ParameterKey: 'SecureVarA', ParameterValue: 'secure:' + (new Buffer.from('EncryptedValue1')).toString('base64') },
            { ParameterKey: 'SecureVarB', ParameterValue: 'secure:' + (new Buffer.from('EncryptedValue2')).toString('base64') }
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

    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [stackInfo] })
    });

    AWS.stub('KMS', 'decrypt').yields(new Error('KMS decryption error'));

    try {
        await Lookup.info('my-stack', 'us-east-1', false, true);
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.DecryptParametersError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    AWS.KMS.restore();
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

    const expected = {
        Name: 'Chuck',
        Age: 18,
        Handedness: 'left',
        Pets: 'Duck,Wombat',
        LuckyNumbers: '3,7,42',
        SecretPassword: 'secret'
    };

    AWS.stub('CloudFormation', 'describeStacks').returns({
        promise: () => Promise.resolve({ Stacks: [stackInfo] })
    });

    try {
        const info = await Lookup.parameters('my-stack', 'us-east-1');
        t.deepEqual(info, expected, 'expected parameters returned');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.template] getTemplate error', async(t) => {
    AWS.stub('CloudFormation', 'getTemplate').yields(new Error('cloudformation failed'));

    try {
        await Lookup.template('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.CloudFormationError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.template] stack does not exist', async(t) => {
    AWS.stub('CloudFormation', 'getTemplate', () => {
        const err = new Error('Stack with id my-stack does not exist');
        err.code = 'ValidationError';
        throw err;
    });

    try {
        await Lookup.template('my-stack', 'us-east-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.StackNotFoundError, 'expected error returned');
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.template] success', async(t) => {
    AWS.stub('CloudFormation', 'getTemplate', function(params) {
        t.deepEqual(params, {
            StackName: 'my-stack',
            TemplateStage: 'Original'
        }, 'getTemplate call sets the TemplateStage');

        return this.request.promise.returns(Promise.resolve({
            RequestMetadata: { RequestId: 'db317457-46f2-11e6-8ee0-fbc06d2d1322' },
            TemplateBody: JSON.stringify(template)
        }));
    });

    try {
        const body = await Lookup.template('my-stack', 'us-east-1');
        t.deepEqual(body, template, 'expected template body returned');
    } catch (err) {
        t.error(err);
    }

    AWS.CloudFormation.restore();
    t.end();
});

test('[lookup.configurations] bucket location error', async(t) => {
    AWS.stub('S3', 'getBucketLocation').yields(new Error('failure'));

    try {
        await Lookup.configurations('my-stack', 'my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.S3Error, 'expected error returned');
    }

    AWS.S3.restore();
    t.end();
});

test('[lookup.configurations] bucket does not exist', async(t) => {
    AWS.stub('S3', 'getBucketLocation').returns({
        promise: () => Promise.resolve('us-east-1')
    });

    AWS.stub('S3', 'listObjects', () => {
        const err = new Error('The specified bucket does not exist');
        err.code = 'NoSuchBucket';
        throw err;
    });

    try {
        await Lookup.configurations('my-stack', 'my-bucket');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.BucketNotFoundError, 'expected error returned');
    }

    AWS.S3.restore();
    t.end();
});

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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
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

    AWS.S3.restore();
    t.end();
});

test('[lookup.decryptParameters] failure', async(t) => {
    AWS.stub('KMS', 'decrypt',).yields(new Error('failure'));

    try {
        await Lookup.decryptParameters({
            ValueA: 'secure:0123456789'
        }, 'us-west-1');
        t.fail();
    } catch (err) {
        t.ok(err instanceof Lookup.DecryptParametersError, 'expected error type');
    }

    AWS.KMS.restore();
    t.end();
});

test('[lookup.decryptParameters] success', async(t) => {
    AWS.stub('KMS', 'decrypt', function(params) {
        const encrypted = new Buffer.from(params.CiphertextBlob, 'base64').toString('utf8');
        if (encrypted === 'EncryptedValue1') {
            return this.request.promise.returns(Promise.resolve({ Plaintext: (new Buffer.from('DecryptedValue1')).toString('base64') }));
        } else if (encrypted === 'EncryptedValue2') {
            return this.request.promise.returns(Promise.resolve({ Plaintext: (new Buffer.from('DecryptedValue2')).toString('base64') }));
        }

        t.fail('Unrecognized encrypted value ' + encrypted);
    });

    try {
        const decryptedParams = await Lookup.decryptParameters({
            PlainText: 'Hello world!',
            SecureVarA: 'secure:' + (new Buffer.from('EncryptedValue1')).toString('base64'),
            SecureVarB: 'secure:' + (new Buffer.from('EncryptedValue2')).toString('base64')
        }, 'us-west-1');

        t.deepEqual(decryptedParams, {
            PlainText: 'Hello world!',
            SecureVarA: 'DecryptedValue1',
            SecureVarB: 'DecryptedValue2'
        }, 'decryptes secure parameters');
    } catch (err) {
        t.error(err);
    }

    AWS.KMS.restore();
    t.end();
});
