var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var tape = require('tape');
var config = require('../index.js');
var getTemplateUrl = config.getTemplateUrl;
var setCredentials = config.setCredentials;
var origAWS = config.AWS;
var env = config.env;


tape('setup MockAWS', function(assert) {
    config.AWS = { S3: MockS3, IAM: MockIAM };
    function MockS3() {}
    MockS3.prototype.getObject = function(options, callback) {
        if (options.Key === 'valid.template') return callback(null, {
            Body: new Buffer(JSON.stringify({
                Parameters: {},
                Resources: {}
            }))
        });
        if (options.Key === 'invalid.template') return callback(null, {
            Body: new Buffer('this is not json')
        });
        return callback(new Error('Unsupported by mock'));
    };
    MockS3.prototype.createBucket = function(options, callback) {
        return callback();
    };
    MockS3.prototype.putObject = function(options, callback) {
        return callback();
    };
    function MockIAM() {}
    MockIAM.prototype.getUser = function(options, callback) {
        return callback(null, {
            userData: {
                User: {
                    Arn: 'arn:aws:iam::1:test'
                }
            }
        });
    };
    assert.end();
});

tape('getTemplateUrl localizes to cn-north-1', function(assert) {
    process.env.AWS_ACCOUNT_ID = '1111111';
    getTemplateUrl('cn','{}','cn-north-1', function(err, data) {
        assert.ifError(err,'no error');
        assert.ok(data.match(/https:\/\/s3.cn-north-1.amazonaws.com.cn/),'localized AWSCN cn-north-1 url matched');
        assert.end();
    });
});

tape('getTemplateUrl localizes to cn-west-1', function(assert) {
    getTemplateUrl('cn','{}','cn-west-1', function(err, data) {
        assert.ifError(err,'no error');
        assert.ok(data.match(/https:\/\/s3.cn-west-1.amazonaws.com.cn/),'localized AWSCN cn-west-1 url matched');
        assert.end();
    });
});

tape('getTemplateUrl localizes to us-west-1', function(assert) {
    getTemplateUrl('cn','{}','us-west-1', function(err, data) {
        assert.ifError(err,'no error');
        assert.ok(data.match(/https:\/\/s3.us-west-1.amazonaws.com/),'us-west-1 url matched');
        assert.end();
    });
});

tape('getTemplateUrl localizes to us-east-1', function(assert) {
    getTemplateUrl('cn','{}','us-east-1', function(err, data) {
        assert.ifError(err,'no error');
        assert.ok(data.match(/https:\/\/s3.amazonaws.com/),'us-east-1 url matched');
        assert.end();
    });
});


tape('setCredentials bucketRegion override', function(assert) {
    setCredentials('key','secretKey','cfn-configs');
    assert.equal(env.bucketRegion, undefined, 'matched undefined bucketRegion');
    process.env.AWS_REGION = 'cn-north-1';
    setCredentials('key','secretKey','cfn-configs');
    assert.equal(env.bucketRegion,'cn-north-1','matched bucketRegion override');
    delete process.env.AWS_REGION;
    env = {};
    setCredentials('key','secretKey','cfn-configs');
    assert.equal(env.bucketRegion,undefined,'matched bucketRegion default value');
    assert.end();
});


tape('unset MockAWS', function(assert) {
    config.AWS = origAWS;
    config.env = {};
    assert.equal(config.env.bucketRegion, undefined, 'bucketRegion cleared');
    assert.equal(config.env.region, undefined, 'region cleared');
    assert.end();
});
