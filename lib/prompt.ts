import inquirer from 'inquirer';

/**
 * @class Prompt
 */
export default class Prompt {
    /**
     * Confirm an action with a yes/no prompt
     *
     * @param message - a question for the user to answer yes or no
     * @param [defaultValue=true] - boolean to use as default
     */
    static async confirm(message: string, defaultValue: boolean = true) {
        const lines = message.split('\n');

        if (lines.length > 1) {
            message = lines.pop();
            lines.unshift('');
            lines.push('');
            process.stdout.write(lines.join('\n'));
        }

        const answers = await inquirer.prompt({
            type: 'confirm',
            name: 'confirmation',
            message: message,
            default: defaultValue
        });

        return answers.confirmation;
    }

    /**
     * Prompt the user for text input
     *
     * @param message - the message to prompt
     * @param [def] - a default value
     */
    static async input(message: string, def: string) {
        const answers = await inquirer.prompt({
            type: 'input',
            name: 'data',
            message: message,
            default: def
        });

        return answers.data;
    }

    /**
     * Prompt the user to select a saved configuration
     *
     * @param configs - names of available saved configurations
     */
    static async configuration(configs: string[]) {
        const answers = await inquirer.prompt({
            type: 'list',
            name: 'config',
            message: 'Saved configurations',
            choices: [].concat(configs, ['New configuration'])
        });

        return answers.config;
    }

    /**
     * Prompt user for CloudFormation template parameters
     *
     * @param {object} questions - inquirer questions for a CloudFormation stack's parameters
     */
    static async parameters(questions) {
        const answers = await inquirer.prompt(questions);

        for (const key in answers) {
            answers[key] = answers[key].toString();
        }

        return answers;
    }
}
