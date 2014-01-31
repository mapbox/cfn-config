#!/usr/bin/env node

var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var argv = require('optimist').argv;
var config = require('..');

var inquirer = require('inquirer');

if (!argv._[0]) return console.error('Template file is required');

try {
    var template = JSON.parse(fs.readFileSync(path.resolve(argv._[0])));
} catch(e) {
    if (e.code === 'ENOENT') return console.error('No such template file');
    else if (e.name === 'SyntaxError') return console.error('Unable to parse template file');
    else throw e;
}

var questions = [{
    type: 'input',
    name: 'StackName',
    message: 'StackName'
}, {
    type: 'list',
    name: 'Region',
    message: 'Region',
    choices: ['us-east-1',
        'us-west-2',
        'us-west-1',
        'eu-west-1',
        'ap-southeast-1',
        'ap-southeast-2',
        'ap-northeast-1',
        'sa-east-1']
}].concat(config.questions(template.Parameters));

inquirer.prompt(questions, function(answers) {
    var config = JSON.stringify(answers, null, 4);
    var filepath = path.resolve(answers.StackName + '.cfn.json');

    console.log('About to write the following to %s:\n%s', filepath, config);

    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Is this ok?',
        default: true
    }], function(answers) {
        if (answers.confirm) fs.writeFile(filepath, config, function(err) {
            if (err) throw err;
        });
    });
});
