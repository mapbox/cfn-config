#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var optimist = require('optimist');

var argv = optimist
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

if (argv.help) return optimist.showHelp();

config.deleteStack(argv, function(err) {
    console.log(err ? err : 'Deleted stack: ' + argv.name);
});
