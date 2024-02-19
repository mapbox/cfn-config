var inquirer = require('inquirer');

var prompt = module.exports = {};

inquirer.registerPrompt('search-list', require('inquirer-search-list'));

/**
 * Confirm an action with a yes/no prompt. This accepts a default value, but
 * defaults to true (yes) if no default is provided.
 * 
 * If you want to force the user to type out "yes" or "no" or variations thereof, use prompt.yesOrNo
 * instead.
 *
 * @param {string} message - a question for the user to answer yes or no
 * @param {boolean} default - boolean to use as default. if omitted, defaults to true (yes)
 * @param {function} callback - a function fired with the user's response as a boolean
 */
prompt.confirm = function(message, defaultValue, callback) {
  if (!callback) {
    callback = defaultValue;
    defaultValue = true;
  }
  var lines = message.split('\n');

  if (lines.length > 1) {
    message = lines.pop();
    lines.unshift('');
    lines.push('');
    process.stdout.write(lines.join('\n'));
  }

  inquirer.prompt({
    type: 'confirm',
    name: 'confirmation',
    message: message,
    default: defaultValue
  }).then(function(answers) {
    callback(null, answers.confirmation);
  });
};

/**
 * Confirm an action with a yes/no prompt. This does not accept a default value.
 * 
 * The callback will be presented with a boolean value (true for yes, false for no), instead of a string value
 *
 * @param {string} message - a question for the user to answer yes or no in a variety of ways.
 * @param {function} callback - a function fired with the user's response as a boolean
 */
prompt.yesOrNo = function(message, callback) {
  var lines = message.split('\n');

  if (lines.length > 1) {
    message = lines.pop();
    lines.unshift('');
    lines.push('');
    process.stdout.write(lines.join('\n'));
  }
  const validYeses = ['y', 'Y'];
  const validNos = ['n', 'N'];

  inquirer.prompt({
    type: 'input',
    name: 'confirmation',
    defaultValue: undefined,
    message: `${message} (y/n)`,
    validate: function(input) {
      if (validYeses.includes(input) || validNos.includes(input)) {
        return true;
      }

      return 'Please enter y or n';
    },
  }).then(function(answers) {
    const toBooleanFlag = (possibleConfirmation) => {
      if (validYeses.includes(possibleConfirmation)) {
        return true;
      }

      if (validNos.includes(possibleConfirmation)) {
        return false;
      }
      throw new Error(`Invalid input: ${possibleConfirmation}. Please enter y or n`);
    };
    callback(null, toBooleanFlag(answers.confirmation));
  });
};

/**
 * Prompt the user for text input
 *
 * @param {string} message - the message to prompt
 * @param {string} [def] - a default value
 * @param {function} callback - a function to be provided with the user's response
 */
prompt.input = function(message, def, callback) {
  if (typeof def === 'function') {
    callback = def;
    def = undefined;
  }
  
  inquirer.prompt({
    type: 'input',
    name: 'data',
    message: message,
    default: def
  }).then(function(answers) {
    callback(null, answers.data);
  });
};

/**
 * Prompt the user to select a saved configuration
 *
 * @param {array} configs - names of available saved configurations
 * @param {function} callback - a function fired with the user's selection
 */
prompt.configuration = function(configs, callback) {
  inquirer.prompt({
    type: 'search-list',
    name: 'config',
    message: 'Saved configurations',
    choices: [].concat(configs, ['New configuration'])
  }).then(function(answers) {
    callback(null, answers.config);
  });
};

/**
 * Prompt user for CloudFormation template parameters
 *
 * @param {object} questions - inquirer questions for a CloudFormation stack's parameters
 * @param {function} callback - a function that will be provided with the user's responses
 */
prompt.parameters = function(questions, callback) {
  inquirer.prompt(questions).then(function(answers) {
    for (var key in answers) answers[key] = answers[key].toString();
    callback(null, answers);
  });
};