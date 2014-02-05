#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var env = require('superenv')('cfn');
var AWS = require('aws-sdk');

var argv = require('optimist')
    .options('template', {
        describe: 'AWS CloudFormation template to be deployed',
        demand: true,
        alias: 't'
    })
    .options('region', {
        describe: 'AWS region deployed the stack',
        demand: true,
        alias: 'r'
    })
    .options('name', {
        describe: 'Name of the AWS CloudFormation to deploy',
        demand: true,
        alias: 'n'
    })
    .argv;

var cfn = new AWS.CloudFormation(_(env).extend({
    region: argv.region
}));

config.readTemplate(argv.template, function(err, template) {
    if (err) throw err;

    config.configure(template, argv.name, argv.region, function(err, configuration) {
        if (err) throw err;

        config.writeConfiguration('', configuration, function(err, aborted) {
            if (err) throw err;

            cfn.createStack({
                StackName: argv.name,
                TemplateBody: JSON.stringify(template, null, 4),
                Parameters: _(configuration.Parameters).map(function(value, key) {
                    return {
                        ParameterKey: key,
                        ParameterValue: value,
                    };
                })
            }, function(err) {
                if (err) throw err;
            });
        });
    });
});
