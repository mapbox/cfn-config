var _ = require('underscore');
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');
var env = require('superenv')('cfn');
var AWS = require('aws-sdk');

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

config.readStackParameters = function (stackname, region, callback) {
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: region
    }));

    cfn.descibeStacks({StackName: stackname}, function (err, data) {
        if (err) return callback(err);
        if (data.Stacks.length < 1) return callback(new Error('Stack ' + stackname + ' not found'));
        var params = data.Stacks[0].Parameters;
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
