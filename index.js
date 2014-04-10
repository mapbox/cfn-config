var _ = require('underscore');
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');
var AWS = require('aws-sdk');
var url = require('url');
var hat = require('hat');
var jsdiff = require('diff');
var env = {};

var config = module.exports;

// Allow override of the default superenv credentials
config.setCredentials = function (accessKeyId, secretAccessKey, bucket) {
    env.accessKeyId = accessKeyId;
    env.secretAccessKey = secretAccessKey;
    env.bucket = bucket;
};

// Run configuration wizard on a CFN template.
config.configure = function(template, stackname, region, overrides, callback) {
    var params = _(template.Parameters).map(_(config.question).partial(overrides));
    inquirer.prompt(params, function(answers) {
        callback(null, {
            StackName: stackname,
            Region: region,
            Parameters: answers
        });
    });
};

// Return a inquirer-compatible question object for a given CFN template
// parameter.
config.question = function(overrides, parameter, key) {
    var question = {
        name: key,
        message: parameter.Description ? key + '. ' + parameter.Description : key,
        filter: function(value) { return value.toString() }
    };
    if ('Default' in parameter) question.default = parameter.Default;
    if (key in overrides.defaults) question.default = overrides.defaults[key];
    if (key in overrides.choices) question.choices = overrides.choices[key];
    if (key in overrides.messages) question.message = overrides.messages[key];
    if (key in overrides.filters) question.filter = overrides.filters[key];

    question.type = (function() {
        if (parameter.NoEcho === 'true') return 'password';
        if (parameter.AllowedValues) return 'list';
        return 'input';
    })();

    question.choices = parameter.AllowedValues;

    return question;
};

config.readStackParameters = function(stackname, region, callback) {
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: region
    }));

    cfn.describeStacks({StackName: stackname}, function (err, data) {
        if (err) return callback(err);
        if (data.Stacks.length < 1) return callback(new Error('Stack ' + stackname + ' not found'));

        var params = data.Stacks[0].Parameters.reduce(function (memo, param) {
            memo[param.ParameterKey] = param.ParameterValue;
            return memo;
        }, {});

        callback(null, params);
    });
}

config.writeConfiguration = function(template, config, callback) {
    var json = JSON.stringify(config.Parameters, null, 4);

    console.log('Region: %s', config.Region);
    console.log('StackName: %s', config.StackName);
    console.log('Parameters:\n%s', json);

    inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'Name this configuration (leave blank to exit)',
        default: ''
    }], function(answers) {
        if (!answers.name) return callback();

        var s3 = new AWS.S3(env);
        var key = path.basename(template, path.extname(template)) + '/' + answers.name + '.cfn.json';
        s3.putObject({
            Bucket: env.bucket,
            Key: key,
            Body: json
        }, function(err, data) {
            if (err) return callback(err);
            console.log('Config written to s3://%s/%s', env.bucket, key);
            callback();
        });
    });
};

// Reusable function for determining configuration
//
// `options` object should include:
// - template: Required. Path to the Cloudformation template
// - region: The AWS region to deploy into
// - name: Required. Name of the Cloudformation stack
// - config: Optional. Path to a configuration file to use
// - update: Defaults to false. Reads existing stack parameters.
// - defaults, choices, messages, filters: Optional. Any of these properties can be
//   set to an object where the keys are Cloudformation parameter names, and the
//   values are as described by https://github.com/SBoudrias/Inquirer.js#question
//
//   Prioritization of defaults written by multiple processes follows:
//   1. Values set by parameters in an existing Cloudformation stack
//   2. Values set by higher-level libs (i.e. passed into this function as options.defaults)
//   3. Values set by a configuration file
//   4. Values set by the Cloudformation template
config.configStack = function(options, callback) {
    options.defaults = options.defaults || {};

    readFile(options.template, options.region, function(err, template) {
        if (err) return callback(new Error('Failed to read template file: ' + err.message));

        if (!options.config) return pickConfig(options.template, function(err, configuration) {
            if (err) return callback(new Error('Failed to read configuration file: ' + err.message));
            afterFileLoad(configuration ? configuration : {});
        });

        var bucketRegion = env.bucketRegion ? env.bucketRegion : 'us-east-1';
        readFile(options.config, bucketRegion, function(err, configuration) {
            if (err) return callback(new Error('Failed to read configuration file: ' + err.message));
            afterFileLoad(configuration);
        });

        function afterFileLoad(fileParameters) {
            if (!options.update) return afterStackLoad(fileParameters, {});
            config.readStackParameters(options.name, options.region, function(err, stackParameters) {
                if (err) return callback(err);

                // Exclude:
                // - stack parameters that no longer exist in the template
                // - masked stack parameters that come from the CFN API
                stackParameters = _(stackParameters).reduce(function(memo, param, key) {
                    if (template.Parameters[key] === undefined) return memo;
                    if (template.Parameters[key].NoEcho === 'true') return memo;
                    memo[key] = param;
                    return memo;
                }, {});

                afterStackLoad(fileParameters, stackParameters);
            });
        }

        function afterStackLoad(fileParameters, stackParameters) {

            var overrides = {
                defaults: _(stackParameters).chain()
                    .defaults(fileParameters)
                    .defaults(options.defaults)
                    .defaults(_(template.Parameters).reduce(function(memo, value, key) {
                        memo[key] = value.Default;
                        return memo;
                    }, {})).value(),
                choices: options.choices || {},
                filters: options.filters || {},
                messages: options.messages || {}
            };

            config.configure(template, options.name, options.region, overrides, function(err, configuration) {
                if (err) return callback(err);
                callback(null, {template: template, configuration: configuration});
            });
        }

    });
};

config.createStack = function(options, callback) {
    // `options` object should include
    // - template: Required. Path to the Cloudformation template
    // - region: The AWS region to deploy into
    // - name: Required. Name of the Cloudformation stack
    // - config: Optional. Path to a configuration file to use

    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));

    config.configStack(options, function (err, configDetails) {
        if (err) return callback(err);

        confirmAction('Ready to create this stack?', function (confirm) {
            if (!confirm) return callback();
            var templateName = path.basename(options.template);
            getTemplateUrl(templateName, configDetails.template, options.region, function(err, url) {
                if (err) return callback(err);
                options.templateUrl = url;
                cfn.createStack(cfnParams(options, configDetails), callback);
            });
        });
    });
};

config.updateStack = function(options, callback) {
    // Same options as createStack above.
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));
    options.update = true;
    config.configStack(options, function(err, configDetails) {
        if (err) return callback(err);
        var finalize = function() {
            confirmAction('Ready to update the stack?', function (confirm) {
                if (!confirm) return callback();
                var templateName = path.basename(options.template);
                getTemplateUrl(templateName, configDetails.template, options.region, function(err, url) {
                    if (err) return callback(err);
                    options.templateUrl = url;
                    cfn.updateStack(cfnParams(options, configDetails), callback);
                });
            });
        };
        var newParameters = configDetails.configuration.Parameters;
        config.stackInfo(options, function(err, stack) {
            if (err) return callback(err);
            var oldParameters = stack.Parameters;
            config.compareParameters(oldParameters, newParameters);
            config.compareTemplates(options, function(err, diff) {
                if (!diff) {
                    console.log('Templates are identical');
                    finalize();
                } else {
                    confirmAction('Templates are different, view patch?', function(confirm) {
                        if (!confirm) finalize();
                        else {
                            console.log(diff);
                            finalize();
                        }
                    });
                }
            });
        });
    });
};

config.deleteStack = function(options, callback) {
    // `options` object should include
    // - name: Required. Name of the Cloudformation stack
    // - region: The AWS region to deploy into
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));

    cfn.describeStacks({ StackName: options.name }, function (err, data) {
        if (err) return callback(err);
        var status = data.Stacks[0].StackStatus;
        if (status === 'DELETE_COMPLETE' || status === 'DELETE_IN_PROGRESS') {
            return callback(new Error([options.name, status].join(' ')));
        }

        confirmAction('Ready to delete the stack ' + options.name + '?', function (confirm) {
            if (!confirm) return callback();
            cfn.deleteStack({
                StackName: options.name
            }, callback);
        });
    });
};

config.stackInfo = function(options, callback) {
    // `options` object should include
    // - name: Required. Name of the Cloudformation stack
    // - region: The AWS region to deploy into
    // - resources: Defaults to false. Gets information about resources in the stack
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));

    cfn.describeStacks({ StackName: options.name }, function(err, data) {
        if (err) return callback(err);
        if (data.Stacks.length < 1) return callback(new Error('Stack ' + stackname + ' not found'));
        var stackInfo = data.Stacks[0];

        stackInfo.Parameters = stackInfo.Parameters.reduce(function(memo, param) {
            memo[param.ParameterKey] = param.ParameterValue;
            return memo;
        }, {});

        stackInfo.Outputs = stackInfo.Outputs.reduce(function(memo, output) {
            memo[output.OutputKey] = output.OutputValue;
            return memo;
        }, {});

        if (!options.resources) return callback(null, stackInfo);

        cfn.describeStackResources({ StackName: options.name }, function(err, data) {
            data = data || {};
            callback(err, _(stackInfo).extend(data));
        });
    });
};

config.compareParameters = function(lhs, rhs) {
    // Determine deleted parameters and value differences
    _(lhs).each(function(value, key) {
        if (!rhs[key])
            console.log('Remove parameter %s with value %s', key, value);
        else if (value != rhs[key])
            console.log('Change parameter %s from %s to %s', key, value, rhs[key]);
    });
    // Determine new parameters
    _(rhs).each(function(value, key) {
        if (!lhs[key])
            console.log('Add parameter %s with value %s', key, value);
    });
};

config.compareTemplates = function(options, callback) {
    var lhs;
    var rhs;
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));
    lhs = JSON.stringify(JSON.parse(fs.readFileSync(options.template)), null, 4);
    cfn.getTemplate({StackName: options.name}, function(err, data) {
        if (err) return callback(err);
        rhs = JSON.stringify(JSON.parse(data.TemplateBody), null, 4);
        if (lhs === rhs) return callback(null, false);
        else return callback(null, jsdiff.createPatch('template', rhs, lhs, options.name, options.template));
    });
};

function readFile(filepath, region, callback) {
    if (!filepath) return callback(new Error('file is required'));

    var uri = url.parse(filepath);
    if (uri.protocol === 's3:') {
        var s3 = new AWS.S3(_(env).extend({ region: region }));
        s3.getObject({
            Bucket: uri.host,
            Key: uri.path.substring(1)
        }, function(err, data) {
            if (err && err.code === 'PermanentRedirect')
                return callback(new Error('Your template must exist in the same region as your CloudFormation stack'));
            if (err) return callback(err);
            ondata(data.Body.toString());
        });
    } else {
        fs.readFile(path.resolve(filepath), function(err, data) {
            if (err) {
                if (err.code === 'ENOENT') return callback(new Error('No such file'));
                return callback(err);
            }
            ondata(data);
        });
    }

    function ondata(data) {
        try {
            var jsonData = JSON.parse(data);
        } catch(e) {
            if (e.name === 'SyntaxError') return callback(new Error('Unable to parse file'));
            return callback(e);
        }
        callback(null, jsonData);
    }
}

function confirmAction(message, callback) {
    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: message,
        default: true
    }], function(answers) {
        callback(answers.confirm);
    });
}

function getTemplateUrl(templateName, templateBody, region, callback) {
    var s3 = new AWS.S3(_(env).extend({ region: region }));
    var iam = new AWS.IAM(_(env).extend({ region: region }));
    iam.getUser({}, function (err, userData) {
        if (err && err.code !== 'AccessDenied') return callback(err);

        // AccessDenied error messages still contain what we need
        var acct = (err ? /(arn:.+) /.exec(err.message)[1] : userData.User.Arn).split(':')[4];

        var bucket = [
            'cfn-config-templates', acct, region
        ].join('-');

        var key = [Date.now(), hat(), templateName].join('-');

        s3.createBucket({Bucket: bucket}, function(err, data) {
            if (err && err.code !== 'BucketAlreadyOwnedByYou') return callback(err);
            s3.putObject({
                Bucket: bucket,
                Key: key,
                Body: JSON.stringify(templateBody)
            }, function(err, data) {
                if (err) return callback(err);
                var host = region === 'us-east-1' ?
                    'https://s3.amazonaws.com' :
                    'https://s3-' + region + '.amazonaws.com'
                callback(null, [host, bucket, key].join('/'));
            });
        });
    });
}

function cfnParams(options, configDetails) {
    return {
        StackName: options.name,
        Capabilities: [ 'CAPABILITY_IAM' ],
        TemplateURL: options.templateUrl,
        Parameters: _(configDetails.configuration.Parameters).map(function(value, key) {
            return {
                ParameterKey: key,
                ParameterValue: value
            };
        })
    };
}

function pickConfig(template, callback) {
    if (typeof template !== 'string') return callback(new TypeError('template must be a template filepath'));
    if (typeof env.bucket !== 'string') return callback(new TypeError('config.bucket must be an s3 bucket'));

    var bucketRegion = env.bucketRegion ? env.bucketRegion : 'us-east-1';
    var s3 = new AWS.S3(_(env).extend({ region : bucketRegion }));
    var prefix = path.basename(template, path.extname(template));

    s3.listObjects({
        Bucket: env.bucket,
        Prefix: prefix
    }, function(err, data) {
        if (err) return callback(err);
        if (!data.Contents) return callback(new Error('no contents found for LIST of s3://' + env.bucket + '/' + prefix));
        var configs = data.Contents
            .filter(function(obj) { return obj.Size > 0; })
            .map(function(obj) { return 's3://' + env.bucket + '/' + obj.Key; });
        ondata(configs);
    });

    function ondata(list) {
        if (list.length === 0) return callback();
        list.push('New configuration');
        inquirer.prompt([{
            type: 'list',
            name: 'config',
            message: 'Config',
            default: list[0],
            choices: list,
        }], onchoice);
    }

    function onchoice(chosen) {
        if (chosen.config === 'New configuration') {
            callback();
        } else {
            readFile(chosen.config, bucketRegion, callback);
        }
    }
}
