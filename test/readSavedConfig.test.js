var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var tape = require('tape');
var config = require('../index.js');
var readSavedConfig = config.readSavedConfig;

var origAWS = config.AWS;
tape('setup MockS3', function(assert) {
    config.AWS = { S3: MockS3 };
    function MockS3() {}
    MockS3.prototype.getObject = function(options, callback) {
        if (options.Bucket === 'test' && options.Key === 'valid.template') return callback(null, {
            Body: new Buffer(JSON.stringify({
                Secret: 'apples',
                AnotherSecret: 'oranges'
            }))
        });
        if (options.Key === 'invalid.template') return callback(null, {
            Body: new Buffer('this is not json')
        });
        return callback(new Error('Unsupported by mock'));
    };
    assert.end();
});


tape('read saved config', function(assert) {
    config.env = {};
    delete process.env.AWS_REGION;
    config.setCredentials('test', 'test', 'test');
    readSavedConfig('valid.template', function(err, data) {
        assert.comment(data);
        assert.ifError(err);
        assert.deepEqual(data, {
            Secret: 'apples',
            AnotherSecret: 'oranges'
        });
        assert.end();
    });
});

tape('read saved config - invalid', function(assert) {
    readSavedConfig('invalid.template', function(err, data) {
        assert.equal(err.toString(), 'Error: Failed to read configuration file: Unable to parse file');
        assert.end();
    });
});

tape('unset MockS3', function(assert) {
    config.AWS = origAWS;
    assert.end();
});
