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
    .options('config', {
        describe: 'Path to a configuration file to read',
        alias: 'c'
    })
    .argv;

function gotTemplate(err, template) {
    if (err) throw err;

    if (argv.config) {
        config.readConfiguration(argv.config, function (err, configuration) {
            if (err) throw err;

            config.defaults = configuration.Parameters;
            config.configure(template, argv.name, argv.region, configured);
        });
    } else {
        config.configure(template, argv.name, argv.region, configured);
    }
}

function configured(err, configuration) {
    if (err) throw err;

    config.writeConfiguration('', configuration, function(err, aborted) {
        if (err) throw err;
    });
}

config.readTemplate(argv.template, gotTemplate);
