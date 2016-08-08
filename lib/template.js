var fs = require('fs');
var error = require('fasterror');
var AWS = require('aws-sdk');
var s3urls = require('s3urls');

var template = module.exports = {};

/**
 * Read a template from a local file or from S3
 *
 * @param {string} templatePath - the absolute path to a local file or an S3 url
 * @param {function} callback - a function to receive the template as a JSON object
 */
template.read = function(templatePath, callback) {
  var params = s3urls.fromUrl(templatePath);

  if (!params.Bucket || !params.Key) return fs.stat(templatePath, function(err) {
    if (err) return callback(new template.NotFoundError('%s does not exist', templatePath));

    var templateBody;
    try { templateBody = require(templatePath); }
    catch (err) { return callback(new template.InvalidTemplateError('Failed to parse %s', templatePath)); }

    if (typeof templateBody === 'function') templateBody(callback);
    else callback(null, templateBody);
  });

  function s3error(err, callback) {
    callback(new template.NotFoundError(
      '%s could not be loaded - S3 responded with %s: %s',
      templatePath, err.code, err.message
    ));
  }

  var s3 = new AWS.S3();
  s3.getBucketLocation({ Bucket: params.Bucket }, function(err, data) {
    if (err) return s3error(err, callback);

    s3 = new AWS.S3({ region: data.LocationConstraint || undefined });

    s3.getObject(params, function(err, data) {
      if (err) return s3error(err, callback);

      var templateBody;
      try { templateBody = JSON.parse(data.Body.toString()); }
      catch (err) { return callback(new template.InvalidTemplateError('Failed to parse %s', templatePath)); }

      callback(null, templateBody);
    });
  });
};

/**
 * Create questions for each Parameter in a CloudFormation template
 *
 * @param {object} templateBody - a parsed CloudFormation template
 * @returns {array} a set of questions for user prompting
 */
template.questions = function(templateBody, overrides) {
  overrides = overrides || {};
  overrides.defaults = overrides.defaults || {};
  overrides.messages = overrides.messages || {};
  overrides.choices = overrides.choices || {};

  return Object.keys(templateBody.Parameters).map(function(name) {
    var parameter = templateBody.Parameters[name];

    var question = {};
    question.name = name;
    question.choices = parameter.AllowedValues;
    question.default = parameter.Default;

    question.message = name;
    if (parameter.Description) question.message += '. ' + parameter.Description;
    question.message += ':';

    question.type = (function() {
      if (parameter.NoEcho) return 'password';
      if (parameter.AllowedValues) return 'list';
      return 'input';
    })();

    question.validate = function(input) {
      var valid = true;
      if ('MinLength' in parameter) valid = valid && input.length >= parameter.MinLength;
      if ('MaxLength' in parameter) valid = valid && input.length <= parameter.MaxLength;
      if ('MinValue' in parameter) valid = valid && Number(input) >= parameter.MinValue;
      if ('MaxValue' in parameter) valid = valid && Number(input) <= parameter.MaxValue;
      if (parameter.AllowedPattern) valid = valid && (new RegExp(parameter.AllowedPattern)).test(input);
      if (parameter.Type === 'List<Number>') valid = valid && input.split(',').every(isNumeric);
      return valid;
    };

    if (name in overrides.defaults) question.default = overrides.defaults[name];
    if (name in overrides.choices) question.choices = overrides.choices[name];
    if (name in overrides.messages) question.message = overrides.messages[name];

    return question;
  });
};

/**
 * Error representing a template that could not be found
 */
template.NotFoundError = error('NotFoundError');

/**
 * Error representing a template that could not be parsed
 */
template.InvalidTemplateError = error('InvalidTemplateError');

function isNumeric(num) {
  return !isNaN(parseFloat(num));
}
