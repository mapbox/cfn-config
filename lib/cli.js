var path = require('path');
var meow = require('meow');
var cfnConfig = require('..');

module.exports.main = main;
module.exports.parse = parse;

function parse(args, env) {
  var cli = meow({
    argv: args,
    help: `
      USAGE: cfn-config <command> <environment> [templatePath] [options]

      command:
        - create                create a new stack
        - update                update an existing stack
        - delete                delete an existing stack
        - info                  fetch information about an existing stack
        - save                  save an existing stack's configuration

      environment:
        Any string. A stack's name is constructed as name-environment

      templatePath:
        The relative path to the CloudFormation template in JSON format, required
        for create and update commands.

      options:
        -n, --name              the stack's base name (default: current dir name)
        -r, --region            the stack's region (default: us-east-1)
        -c, --config-bucket     an S3 bucket for storing stack configurations.
                                Required for the create, update, and save commands.
        -t, --template-bucket   an S3 bucket for storing templates
                                (default: cfn-config-templates-$AWS_ACCOUNT_ID-region)
        -k, --kms               a KMS key ID for parameter encryption or
                                configuration encryption at rest on S3. If not
                                provided, no encryption will be performed. If
                                provided as a flag without a value, the default
                                key id alias/cloudformation will be used.
        -f, --force             perform a create/update/delete command without any
                                prompting, accepting all defaults
        -e, --extended          display resource details with the info command
        -d, --decrypt           decrypt secure parameters with the info command
        -p, --parameters        JSON string of parameters to override on create/update
    `,
    flags: {
      'config-bucket': {
        alias: 'c',
        type: 'string'
      },
      'template-bucket': {
        alias: 't',
        type: 'string'
      },
      name: {
        alias: 'n',
        type: 'string',
        default: path.basename(process.cwd()),
      },
      region: {
        alias: 'r',
        type: 'string',
        default: 'us-east-1'
      },
      kms: {
        alias: 'k',
        default: false
      },
      force: {
        alias: 'f',
        type: 'boolean',
        default: false
      },
      extended: {
        alias: 'e',
        type: 'boolean',
        extended: false,
      },
      decrypt: {
        alias: 'd',
        type: 'boolean',
        default: false
      },
      parameters: {
        alias: 'p',
        type: 'string',
        default: undefined
      }
    }
  });

  // Make sure that we can set a template bucket for create and update commands
  if (/create|update/.test(cli.input[0])) {
    if (!cli.flags.templateBucket && !env.AWS_ACCOUNT_ID)
      throw new Error('Provide $AWS_ACCOUNT_ID as an environment variable to use the default template bucket, or set --template-bucket');
    if (!cli.flags.templateBucket) cli.flags.templateBucket =
      ['cfn-config-templates', env.AWS_ACCOUNT_ID, cli.flags.region].join('-');
  }

  if (cli.flags.parameters) {
    try {
      cli.flags.p =
      cli.flags.parameters = JSON.parse(cli.flags.parameters);
    } catch(err) {
      throw new Error('Invalid JSON for --parameters: ' + err.message);
    }
  }

  return {
    command: cli.input[0],
    environment: cli.input[1],
    templatePath: cli.input[2] ? path.resolve(cli.input[2]) : undefined,
    overrides: { force: cli.flags.force, kms: cli.flags.kms, parameters: cli.flags.parameters },
    options: cli.flags,
    help: cli.help
  };
}

function main(parsed, callback) {
  // Setup commands, make sure that CLI request uses a valid command
  var available = cfnConfig.commands(parsed.options);
  if (!available[parsed.command])
    return callback({ message: 'Error: invalid command\n\n' + parsed.help });

  // Check for valid environment
  if (!parsed.environment)
    return callback({ message: 'Error: missing environment\n\n' + parsed.help });

  // Check for template path on create and update
  if (/create|update/.test(parsed.command) && !parsed.templatePath)
    return callback({ message: 'Error: missing templatePath\n\n' + parsed.help });

  // Set the arguments for the command that will run
  var args = [parsed.environment];

  if (parsed.command === 'info') {
    args.push(parsed.options.extended);
    args.push(parsed.options.decrypt);
  }

  if (/create|update/.test(parsed.command)) args.push(parsed.templatePath);

  if (parsed.overrides.kms && parsed.command === 'save') args.push(parsed.overrides.kms);

  if (/create|update|delete/.test(parsed.command)) args.push(parsed.overrides);

  args.push(callback);

  // Run the command
  available[parsed.command].apply(null, args);
}
