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
        describe: 'AWS region deployed the stack',
        demand: true,
        alias: 'r'
    })
    .options('localize', {
        describe: 'Automatically localize template to AWS China',
        alias: 'l',
        boolean: true
    })
    .argv;

if (argv.help) return optimist.showHelp();

config.readFile(argv, function(err, template) {
    if (err) return (err);
    if (argv.localize && argv.region.match(/^cn-/)) {
        config.localize(argv, template, function(err,localizedTemplate) {
            if (err) throw err;
            console.log(JSON.stringify(localizedTemplate));
        });
    }
});
