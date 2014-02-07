var _ = require('underscore');
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');
var env = require('superenv')('cfn');
var AWS = require('aws-sdk');
var async = require('async');

var config = module.exports;

// `defaults` property that can be overriden to provide your own defaults.
// Keys should be the parameter's name, values either a string or function
// If finding the default value is asychronous, then the funciton has to
// declare itself as such. See https://github.com/SBoudrias/Inquirer.js#question
// Prioritization of defaults written by multiple processes follows:
// 1. Values set by parameters in an existing Cloudformation stack
// 2. Values set by higher-level libs (i.e. var config = require('cfn-config'); config.defaults = ...)
// 3. Values set by a configuration file
// 4. Values set by the Cloudformation template
config.defaults = {};

// Run configuration wizard on a CFN template.
config.configure = function(template, stackname, region, callback) {
    inquirer.prompt(_(template.Parameters).map(config.question), function(answers) {
        callback(null, {
            StackName: stackname,
            Region: region,
            Parameters: answers
        });
    });
};

// Return a inquirer-compatible question object for a given CFN template
// parameter.
config.question = function(parameter, key) {
    var question = {
        name: key,
        message: key + '. ' + parameter.Description || key,
        filter: function(value) { return value.toString() }
    };
    if ('Default' in parameter) question.default = parameter.Default;
    if (key in config.defaults) question.default = config.defaults[key];

    question.type = (function() {
        if (parameter.NoEcho === 'true') return 'password';
        if (parameter.AllowedValues) return 'list';
        return 'input';
    })();

    question.choices = parameter.AllowedValues;

    return question;
};

config.readTemplate = function(filepath, callback) {
    readJsonFile('template', filepath, callback);
}

config.readConfiguration = function (filepath, callback) {
    readJsonFile('configuration', filepath, function (err, configuration) {
        if (err) return callback(err);
        // Config file defaults lose to everything else
        config.defaults = _(configuration.Parameters).extend(config.defaults);
        callback(null, configuration);
    });
}

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

        // Stack params take precedence over all other defaults
        config.defaults = _(config.defaults).extend(params);
        callback(null, params);
    });
}

config.writeConfiguration = function(filepath, config, callback) {
    var filepath = path.resolve(path.join(filepath, config.StackName + '.cfn.json'));
    var json = JSON.stringify(config, null, 4);

    console.log('About to write the following to %s:\n%s', filepath, json);

    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Is this ok?',
        default: true
    }], function(answers) {
        if (!answers.confirm) return callback();
        fs.writeFile(filepath, json, callback);
    });
};

// Reusable function for determining configuration
config.configStack = function(options, callback) {
    // `options` object should include
    // - template: Required. Path to the Cloudformation template
    // - region: Defaults to 'us-east-1'. The AWS region to deploy into
    // - name: Required. Name of the Cloudformation stack
    // - config: Optional. Path to a configuration file to use
    // - update: Defaults to false. Reads existing stack parameters.
    config.readTemplate(options.template, function(err, template) {
        if (err) return callback(err);

        var beforeWrite = [];
        if (options.config) {
            beforeWrite.push(function(callback) {
                config.readConfiguration(options.config, callback);
            });
        }
        if (options.update) {
            beforeWrite.push(function(callback) {
                config.readStackParameters(options.name, options.region, callback);
            });
        }

        async.series(beforeWrite, function(err) {
            config.configure(template, options.name, options.region, function(err, configuration) {
                if (err) return callback(err);
                config.writeConfiguration('', configuration, function(err, aborted) {
                    if (err) return callback(err);
                    callback(null, {template: template, configuration: configuration});
                });
            });
        });
    });
};

config.createStack = function(options, callback) {
    // `options` object should include
    // - template: Required. Path to the Cloudformation template
    // - region: Defaults to 'us-east-1'. The AWS region to deploy into
    // - name: Required. Name of the Cloudformation stack
    // - config: Optional. Path to a configuration file to use
    // - iam: Defaults to false. Allows stack to create IAM resources

    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region || 'us-east-1'
    }));

    config.configStack(options, function (err, configDetails) {
        if (err) return callback(err);

        cfn.createStack({
            StackName: options.name,
            TemplateBody: JSON.stringify(configDetails.template, null, 4),
            Parameters: _(configDetails.configuration.Parameters).map(function(value, key) {
                return {
                    ParameterKey: key,
                    ParameterValue: value
                };
            }),
            Capabilities: options.iam ? [ 'CAPABILITY_IAM' ] : []
        }, callback);
    });
};

config.updateStack = function(options, callback) {
    // Same options as createStack above.

    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region || 'us-east-1'
    }));

    options.update = true;
    config.configStack(options, function(err, configDetails) {
        if (err) return callback(err);

        cfn.updateStack({
            StackName: options.name,
            TemplateBody: JSON.stringify(configDetails.template, null, 4),
            Parameters: _(configDetails.configuration.Parameters).map(function(value, key) {
                return {
                    ParameterKey: key,
                    ParameterValue: value
                };
            }),
            Capabilities: options.iam ? [ 'CAPABILITY_IAM' ] : []
        }, callback);
    });
}

config.deleteStack = function(options, callback) {
    // `options` object should include
    // - name: Required. Name of the Cloudformation stack
    // - region: Defaults to 'us-east-1'. The AWS region to deploy into
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region || 'us-east-1'
    }));

    cfn.deleteStack({
        StackName: options.name
    }, callback);
};

config.stackInfo = function(options, callback) {
    // `options` object should include
    // - name: Required. Name of the Cloudformation stack
    // - region: Defaults to 'us-east-1'. The AWS region to deploy into
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region || 'us-east-1'
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

        callback(null, stackInfo);
    });
}

function readJsonFile(filelabel, filepath, callback) {
    if (!filepath) return callback(new Error(filelabel + ' file is required'));

    fs.readFile(path.resolve(filepath), function(err, data) {
        if (err) {
            if (err.code === 'ENOENT') return callback(new Error('No such ' + filelabel + ' file'));
            return callback(err);
        }
        try {
            var jsonData = JSON.parse(data);
        } catch(e) {
            if (e.name === 'SyntaxError') return callback(new Error('Unable to parse ' + filelabel + ' file'));
            return callback(e);
        }
        callback(null, jsonData);
    });
}
