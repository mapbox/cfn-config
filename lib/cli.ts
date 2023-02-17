import path from 'path';
import meow from 'meow';
import CFNConfig from '../index.js';

function parse(args: object, env: object) {
    const cli = meow({
        argv: args,
        importMeta: import.meta,
        help: `
      USAGE: cfn-config <command> <environment> [templatePath] [options]

      command:
        - create                create a new stack
        - update                update an existing stack
        - delete                delete an existing stack
        - cancel                cancel and rollback an update
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
        -c, --config_bucket     an S3 bucket for storing stack configurations.
                                Required for the create, update, and save commands.
        -t, --template_bucket   an S3 bucket for storing templates
                                (default: cfn-config-templates-$AWS_ACCOUNT_ID-region)
        ---tags                 Add a tag that will be applied to all resources in the stack
                                --tags Key=Value --tags=Key2=Value2
    `,
        flags: {
            config_bucket: {
                alias: 'c',
                type: 'string'
            },
            tags: {
                type: 'string',
                isMultiple: true
            },
            template_bucket: {
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
            }
        }
    });

    if (cli.flags.tags) {
        cli.flags.tags = cli.flags.tags.map((tag) => {
            return {
                Key: tag.split('=')[0].trim(),
                Value: tag.split('=')[1].trim()
            };
        });
    }

    // Make sure that we can set a template bucket for create and update commands
    if (/create|update/.test(cli.input[0])) {
        if (!cli.flags.templateBucket && !env.AWS_ACCOUNT_ID)
            throw new Error('Provide $AWS_ACCOUNT_ID as an environment variable to use the default template bucket, or set --template_bucket');
        if (!cli.flags.templateBucket)
            cli.flags.templateBucket = ['cfn-config-templates', env.AWS_ACCOUNT_ID, cli.flags.region].join('-');
    }

    if (cli.flags.parameters) {
        try {
            cli.flags.p = cli.flags.parameters = JSON.parse(cli.flags.parameters);
        } catch(err) {
            throw new Error('Invalid JSON for --parameters: ' + err.message);
        }
    }

    return {
        command: cli.input[0],
        environment: cli.input[1],
        templatePath: cli.input[2] ? path.resolve(cli.input[2]) : undefined,
        options: cli.flags,
        help: cli.help
    };
}

async function main(parsed) {
    // Setup commands, make sure that CLI request uses a valid command
    const available = new cfnConfig.Commands(parsed.options);

    if (!available[parsed.command])
        throw new Error('Error: invalid command\n\n' + parsed.help);

    // Check for valid environment
    if (!parsed.environment)
        throw new Error('Error: missing environment\n\n' + parsed.help);

    // Check for template path on create and update
    if (/create|update/.test(parsed.command) && !parsed.templatePath)
        throw new Error('Error: missing templatePath\n\n' + parsed.help);

    // Set the arguments for the command that will run
    const args = [parsed.environment];

    if (/create|update/.test(parsed.command)) args.push(parsed.templatePath);

    // Run the command
    await available[parsed.command](...args);
}

export {
    main,
    parse
};
