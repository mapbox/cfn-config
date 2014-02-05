#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');

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

config.readTemplate(argv.template, function(err, template) {
    if (err) throw err;

    config.configure(template, argv.name, argv.region, function(err, configuration) {
        if (err) throw err;

        config.writeConfiguration('', configuration, function(err, aborted) {
            if (err) throw err;
        });
    });
});
