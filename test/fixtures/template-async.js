module.exports = function(callback) {
  setTimeout(callback, 10, null, require('./template-sync'));
};
