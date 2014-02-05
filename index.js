var _ = require('underscore');
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');

var config = module.exports;

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
        message: key + '. ' + parameter.Description || key
    };
    if ('Default' in parameter) question.default = parameter.Default;

    question.type = (function() {
        if (parameter.NoEcho === 'true') return 'password';
        if (parameter.AllowedValues) return 'list';
        return 'input';
    })();

    question.choices = parameter.AllowedValues;

    return question;
};

module.exports.readTemplate = function(filepath, callback) {
    if (!filepath) return callback(new Error('Template file is required'));

    fs.readFile(path.resolve(filepath), function(err, data) {
        if (err) {
            if (err.code === 'ENOENT') return callback(new Error('No such template file'));
            return callback(err);
        }
        try {
            var template = JSON.parse(data);
        } catch(e) {
            if (e.name === 'SyntaxError') return callback(new Error('Unable to parse template file'));
            return callback(e);
        }
        callback(null, template);
    });
};

module.exports.writeConfiguration = function(filepath, config, callback) {
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
