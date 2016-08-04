var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var tape = require('tape');
var config = require('../index.js');
var compareTemplates = config.compareTemplates;

var origAWS = config.AWS;
tape('setup MockCF', function(assert) {
    config.AWS = { CloudFormation: MockCF };
    function MockCF() {}
    MockCF.prototype.getTemplate = function(options, callback) {
        if (options.StackName === 'a') return callback(null, {
            TemplateBody: JSON.stringify({
                Parameters: {},
                Resources: {},
                Outputs: {}
            })
        });
        return callback(new Error('Unsupported by mock'));
    };
    assert.end();
});

tape('compareTemplates', function(assert) {
    compareTemplates({
        template: __dirname + '/fixtures/compareTemplates.template',
        name: 'a'
    }, function(err, data) {
        assert.ifError(err);
        assert.equal(typeof data, 'string');
        assert.equal(data.indexOf('+  Outputs') !== -1, true);
        assert.end();
    });
});


tape('compareTemplates.js', function(assert) {
    compareTemplates({
        template: __dirname + '/fixtures/compareTemplates.template.js',
        name: 'a'
    }, function(err, data) {
        assert.ifError(err);
        assert.equal(typeof data, 'string');
        assert.equal(data.indexOf('+  Outputs') !== -1, true);
        assert.end();
    });
});

tape('unset MockCF', function(assert) {
    config.AWS = origAWS;
    assert.end();
});

