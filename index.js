var _ = require('underscore');
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');
var AWS = require('aws-sdk');
var env = {}, crypto;

var config = module.exports;

// Allow override of the default superenv credentials
config.setCredentials = function(accessKeyId, secretAccessKey, secureKey) {
    env.accessKeyId = accessKeyId;
    env.secretAccessKey = secretAccessKey;
    env.secureKey = secureKey;
    crypto = /.gpg$/.exec(secureKey || '') ? require('./lib/gpg-crypto') : require('./lib/rsa-crypto');
};

// Run configuration wizard on a CFN template.
config.configure = function(template, stackname, region, overrides, callback) {
    var params = _(template.Parameters).map(_(config.question).partial(overrides));

    inquirer.prompt(params, function(answers) {
        callback(null, {
            StackName: stackname,
            Region: region,
            Parameters: answers
        });
    });
};

// Return a inquirer-compatible question object for a given CFN template
// parameter.
config.question = function(overrides, parameter, key) {
    var filter = !parameter.NoEcho || !crypto.encrypt ?
        function(value) { return value.toString(); } :
        function(value) {
            var done = this.async();
            crypto.encrypt(value, function(err, result) {
                if (err) throw err; // no access to a callback that might handle this
                done(result);
            });
        };

    var question = {
        name: key,
        message: key + '. ' + parameter.Description || key,
        filter: filter,
        choices: parameter.AllowedValues
    };

    if ('Default' in parameter) question.default = parameter.Default;
    if (key in overrides.defaults) question.default = overrides.defaults[key];
    if (key in overrides.choices) question.choices = overrides.choices[key];
    if (key in overrides.messages) question.message = overrides.messages[key];
    if (key in overrides.filters) question.filter = overrides.filters[key];

    question.type = (function() {
        if (parameter.NoEcho === 'true') return 'password';
        if (question.choices) return 'list';
        return 'input';
    })();

    return question;
};

config.readTemplate = function(filepath, callback) {
    readJsonFile('template', filepath, callback);
}

config.readConfiguration = function(filepath, callback) {
    readJsonFile('configuration', filepath, function(err, configuration) {
        if (err) return callback(err);

        var pairs = _(configuration.Parameters).pairs();
        var paramsProcessed = 0, paramsToProcess = pairs.length;

        pairs.forEach(function(pair) {
            var key = pair[0], value = pair[1];

            if (crypto.prefix && value.indexOf(crypto.prefix) === 0) {
                crypto.decrypt(value, function(err, result) {
                    if (err) return afterProcess(err);
                    configuration.Parameters[key] = result;
                    afterProcess();
                });
            } else { afterProcess(); }
        });

        function afterProcess(err) {
            if (err) return callback(err); // hmmm... don't want to throw this more than once
            paramsProcessed++;
            if (paramsProcessed === paramsToProcess) callback(null, configuration);
        }
    });
}

config.readStackParameters = function(stackname, region, callback) {
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: region
    }));

    cfn.describeStacks({StackName: stackname}, function(err, data) {
        if (err) return callback(err);
        if (data.Stacks.length < 1) return callback(new Error('Stack ' + stackname + ' not found'));

        var params = data.Stacks[0].Parameters.reduce(function(memo, param) {
            memo[param.ParameterKey] = param.ParameterValue;
            return memo;
        }, {});

        callback(null, params);
    });
}

config.writeConfiguration = function(filepath, config, callback) {
    var filepath = path.resolve(path.join(filepath, config.StackName + '.cfn.json'));
    var json = JSON.stringify(config, null, 4);

    console.log('Stack configuration:\n%s', json);

    confirmAction('Okay to write this configuration to ' + filepath + '?', function(confirm) {
        if (!confirm) return callback();
        fs.writeFile(filepath, json, callback);
    });
};

// Reusable function for determining configuration
//
// `options` object should include:
// - template: Required. Path to the CloudFormation template
// - region: The AWS region to deploy into
// - name: Required. Name of the CloudFormation stack
// - config: Optional. Path to a configuration file to use
// - update: Defaults to false. Reads existing stack parameters.
// - defaults, choices, messages, filters: Optional. Any of these properties can be
//   set to an object where the keys are CloudFormation parameter names, and the
//   values are as described by https://github.com/SBoudrias/Inquirer.js#question
//
//   Prioritization of defaults written by multiple processes follows:
//   1. Values set by parameters in an existing CloudFormation stack
//   2. Values set by higher-level libs (i.e. passed into this function as options.defaults)
//   3. Values set by a configuration file
//   4. Values set by the CloudFormation template
config.configStack = function(options, callback) {
    options.defaults = options.defaults || {};
    config.readTemplate(options.template, function(err, template) {
        if (err) return callback(err);

        if (!env.secureKey) return afterPassphrasePrompt({});

        inquirer.prompt([{
            type: 'password',
            name: 'passphrase',
            message: 'Your key\'s passphrase',
            default: null
        }], afterPassphrasePrompt);

        function afterPassphrasePrompt(answer) {
            if (_(answer).has('passphrase')) crypto = crypto(env.secureKey, answer.passphrase);

            if (!options.config) return afterFileLoad({});

            config.readConfiguration(options.config, function(err, configuration) {
                if (err) return callback(err);
                afterFileLoad(configuration.Parameters);
            });
        }

        function afterFileLoad(fileParameters) {
            if (!options.update) return afterStackLoad(fileParameters, {});
            config.readStackParameters(options.name, options.region, function(err, stackParameters) {
                if (err) return callback(err);

                // Exclude masked stack parameters that come from the CFN API.
                stackParameters = _(stackParameters).reject(function(param, key) {
                    return template.Parameters[key].NoEcho === 'true';
                });

                afterStackLoad(fileParameters, stackParameters);
            });
        }

        function afterStackLoad(fileParameters, stackParameters) {

            var overrides = {
                defaults: _(stackParameters).chain()
                    .defaults(fileParameters)
                    .defaults(options.defaults)
                    .defaults(_(template.Parameters).reduce(function(memo, value, key) {
                        memo[key] = value.Default;
                        return memo;
                    }, {})).value(),
                choices: options.choices || {},
                filters: options.filters || {},
                messages: options.messages || {}
            };

            config.configure(template, options.name, options.region, overrides, function(err, configuration) {
                if (err) return callback(err);
                config.writeConfiguration('', configuration, function(err, aborted) {
                    if (err) return callback(err);
                    callback(null, {template: template, configuration: configuration});
                });
            });
        }

    });
};

config.createStack = function(options, callback) {
    // `options` object should include
    // - template: Required. Path to the CloudFormation template
    // - region: The AWS region to deploy into
    // - name: Required. Name of the CloudFormation stack
    // - config: Optional. Path to a configuration file to use
    // - iam: Defaults to false. Allows stack to create IAM resources

    deployPrep(options, function(err, cfn, configuration) {
        if (err && err == 'Canceled') return callback();
        if (err) return callback(err);
        cfn.createStack(configuration, callback);
    });
};

config.updateStack = function(options, callback) {
    // Same options as createStack above.

    deployPrep(options, function(err, cfn, configuration) {
        if (err && err == 'Canceled') return callback();
        if (err) return callback(err);
        cfn.updateStack(configuration, callback);
    });
}

config.deleteStack = function(options, callback) {
    // `options` object should include
    // - name: Required. Name of the CloudFormation stack
    // - region: The AWS region to deploy into
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));

    confirmAction('Ready to delete the stack ' + options.name + '?', function(confirm) {
        if (!confirm) return callback();
        cfn.deleteStack({
            StackName: options.name
        }, callback);
    })
};

config.stackInfo = function(options, callback) {
    // `options` object should include
    // - name: Required. Name of the CloudFormation stack
    // - region: The AWS region to deploy into
    // - resources: Defaults to false. Gets information about resources in the stack
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
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

        if (!options.resources) return callback(null, stackInfo);

        cfn.describeStackResources({ StackName: options.name }, function(err, data) {
            data = data || {};
            callback(err, _(stackInfo).extend(data));
        });
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

function deployPrep(options, callback) {
    var cfn = new AWS.CloudFormation(_(env).extend({
        region: options.region
    }));

    config.configStack(options, stackConfigured);

    function stackConfigured(err, configDetails) {
        if (err) return callback(err);

        confirmAction('Ready to push configuration to CloudFormation?', function(confirm) {
            if (!confirm) return callback('Canceled');

            var pairs = _(configDetails.configuration.Parameters).pairs();
            var paramsProcessed = 0, paramsToProcess = pairs.length;
            pairs.forEach(function(pair) {
                var key = pair[0], value = pair[1];
                if (!crypto.prefix || value.indexOf(crypto.prefix) !== 0) return afterProcessed(null);
                
                crypto.decrypt(value, function(err, result) {
                    if (err) return callback(err);
                    configDetails.configuration.Parameters[key] = result;
                    afterProcessed(null);
                });
            });

            function afterProcessed(err) {
                if (err) return callback(err); // hmmm... again

                paramsProcessed++;
                if (paramsProcessed < paramsToProcess) return;

                callback(null, cfn, {
                    StackName: options.name,
                    TemplateBody: JSON.stringify(configDetails.template, null, 4),
                    Parameters: _(configDetails.configuration.Parameters).map(function(value, key) {
                        return { ParameterKey: key, ParameterValue: value };
                    }),
                    Capabilities: options.iam ? [ 'CAPABILITY_IAM' ] : []
                });
            }
        });
    }
}

function confirmAction(message, callback) {
    inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: message,
        default: true
    }], function(answers) {
        callback(answers.confirm);
    });
}