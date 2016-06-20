#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var env = require('superenv')('cfn');
var optimist = require('optimist');

config.setCredentials(env.accessKeyId, env.secretAccessKey, env.bucket);

var argv = optimist
    .options('template', {
        describe: 'AWS CloudFormation template to be dumped to console',
        demand: true,
        alias: 't'
    })
    .options('region', {
        describe: 'Which region to output template for',
        demand: true,
        alias: 'r'
    })
    .argv;

if (argv.help) return optimist.showHelp();

config.readFile(argv, function(err, template) {
    if (err) return (err);
    console.log(JSON.stringify(template));
    process.exit(1);
});
