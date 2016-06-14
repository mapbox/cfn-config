var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var tape = require('tape');
var config = require('../index.js');
var getTemplateUrl = config.getTemplateUrl;
var setCredentials = config.setCredentials;
var origAWS = config.AWS;
var origEnv = config.env;
var localize = config.localize;

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

tape('setCredentials bucketRegion override', function(assert) {
    process.env.AWS_REGION = 'cn-north-1';
    setCredentials('key','secretKey','cfn-configs');
    assert.equal(config.env.bucketRegion,'cn-north-1','matched bucketRegion override');
    delete process.env.AWS_REGION;
    config.env = {};
    setCredentials('key','secretKey','cfn-configs');
    assert.equal(config.env.bucketRegion,undefined,'matched bucketRegion default value');
    config.env = {};
    assert.end();
});


tape('unset MockAWS', function(assert) {
    config.AWS = origAWS;
    config.env = origEnv;
    assert.end();
});


var awsFixture = {
    ArnTest: {
        Arn1: "arn:aws:s3:::test-account",
        Arn2: "arn:aws:s3:::test-account/test/*",
        ArnJoin: {
            "Fn::Join": [
                "",
                [
                    "something",
                    "arn:aws:ec2:::"
                ]
            ]
        }
    },
    EndpointTest: {
        Standalone: "amazonaws.com",
        S3GlobalJoin: ".s3.amazonaws.com",
        ServiceGlobal: "ec2.amazonaws.com",
        DashS3: "s3-eu-west-1.amazonaws.com",
        Service1: "ec2.us-east-1.amazonaws.com",
        Service2: "cognito-identity.us-east-1.amazonaws.com"
    }
};

tape('localize-in-AWSCN-cn-north-1', function(assert) {
    var awsFixtureNorth = JSON.parse(JSON.stringify(awsFixture));
    localize({region: 'cn-north-1'}, awsFixtureNorth, function(err, data) {
        assert.ifError(err);
        assert.equal(data.ArnTest.Arn1,'arn:aws-cn:s3:::test-account','Arn1 matched');
        assert.equal(data.ArnTest.Arn2,'arn:aws-cn:s3:::test-account/test/*','Arn2 matched');
        assert.equal(data.ArnTest.ArnJoin['Fn::Join'][1][1],'arn:aws-cn:ec2:::','FnJoin matched');
        assert.equal(data.EndpointTest.Standalone,'cn-north-1.amazonaws.com.cn','Standalone endpoint matched');
        assert.equal(data.EndpointTest.S3GlobalJoin,'.s3.cn-north-1.amazonaws.com.cn','S3 global joined endpoint matched');
        assert.equal(data.EndpointTest.ServiceGlobal,'ec2.cn-north-1.amazonaws.com.cn','Service global endpoint matched');
        assert.equal(data.EndpointTest.DashS3,'s3.cn-north-1.amazonaws.com.cn','Dashed S3 endpoint matched');
        assert.equal(data.EndpointTest.Service1,'ec2.cn-north-1.amazonaws.com.cn','Service1 endpoint matched');
        assert.equal(data.EndpointTest.Service2,'cognito-identity.cn-north-1.amazonaws.com.cn','Service2 endpoint matched');
        assert.end();
    });
});

tape('readFile-in-AWSCN-cn-west-1', function(assert) {
    var awsFixtureWest = JSON.parse(JSON.stringify(awsFixture));
    localize({region: 'cn-west-1'}, awsFixtureWest, function(err, data) {
        assert.ifError(err);
        assert.equal(data.ArnTest.Arn1,'arn:aws-cn:s3:::test-account','Arn1 matched');
        assert.equal(data.ArnTest.Arn2,'arn:aws-cn:s3:::test-account/test/*','Arn2 matched');
        assert.equal(data.ArnTest.ArnJoin['Fn::Join'][1][1],'arn:aws-cn:ec2:::','FnJoin matched');
        assert.equal(data.EndpointTest.Standalone,'cn-west-1.amazonaws.com.cn','Standalone endpoint matched');
        assert.equal(data.EndpointTest.S3GlobalJoin,'.s3.cn-west-1.amazonaws.com.cn','S3 global joined endpoint matched');
        assert.equal(data.EndpointTest.ServiceGlobal,'ec2.cn-west-1.amazonaws.com.cn','Service global endpoint matched');
        assert.equal(data.EndpointTest.DashS3,'s3.cn-west-1.amazonaws.com.cn','Dashed S3 endpoint matched');
        assert.equal(data.EndpointTest.Service1,'ec2.cn-west-1.amazonaws.com.cn','Service1 endpoint matched');
        assert.equal(data.EndpointTest.Service2,'cognito-identity.cn-west-1.amazonaws.com.cn','Service2 endpoint matched');
        assert.end();
    });
});

tape('localize called with non cn region', function(assert) {
    localize({region: 'us-east-1'}, awsFixture, function(err, data) {
        assert.deepEqual(awsFixture,data);
        assert.end();
    });
});

tape('readFile-in-AWSCN with unavailable arn', function(assert) {
    var awsFixtureUnavail = JSON.parse(JSON.stringify(awsFixture));
    awsFixtureUnavail.ArnTest.Arn1 = "arn:aws:lambda:::";

    localize({region: 'cn-north-1'}, awsFixtureUnavail, function(err, res) {
        assert.equal(err,'Unavailable service found in arn match: arn:aws:lambda:::','Errors on unavailable arn');
        assert.end();
    });
});

tape('readFile-in-AWSCN with unavailable endpoint', function(assert) {
    var awsFixtureUnavail = JSON.parse(JSON.stringify(awsFixture));
    awsFixtureUnavail.ArnTest.Service1 = "lambda.amazonaws.com";

    localize({region: 'cn-north-1'}, awsFixtureUnavail, function(err, res) {
        assert.equal(err,'Unavailable service found in endpoint match: lambda.amazonaws.com','Errors on unavailable endpoint');
        assert.end();
    });
});

tape('readFile-in-AWSCN with hardcoded account id', function(assert) {
    var awsFixtureUnavail = JSON.parse(JSON.stringify(awsFixture));
    awsFixtureUnavail.ArnTest.Arn1 = "arn:aws:ec2:us-east-1:234858372212:something:stack";

    localize({region: 'cn-north-1'}, awsFixtureUnavail, function(err, res) {
        assert.equal(err,'Hardcoded AWS account id found in arn: arn:aws:ec2:us-east-1:234858372212:something:stack','Errors on hardcoded account id');
        assert.end();
    });
});
