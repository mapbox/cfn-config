var _ = require('underscore');

// Convert a object of parameters into an array of question for inquirer.
module.exports.questions = function(parameters) {
    return _(parameters).reduce(function(memo, parameter, key) {
        var question = {
            name: key,
            message: key + '. ' + parameter.Description || key
        };
        if ('Default' in parameter) question.default = parameter.Default;

        question.type = (function() {
            if (parameter.NoEcho === 'true') return 'password';
            if (parameter.AllowedValues) return 'rawlist';
            return 'input';
        })();

        question.choices = parameter.AllowedValues;

        memo.push(question);
        return memo;
    }, []);
};
