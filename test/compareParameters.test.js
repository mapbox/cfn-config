var tape = require('tape');
var util = require('util');
var config = require('../index.js');
var compareParameters = config.compareParameters;

tape('compareParameters', function(assert) {
    var origLog = console.log;
    var lastLog = null;
    console.log = function(arg) {
        if (!(/^(Parameter changes| {)/).test(arg)) {
            origLog.apply(console, arguments);
        }
        lastLog = util.format.apply(util, arguments);
    };

    lastLog = null;
    compareParameters({}, {});
    assert.deepEqual(lastLog, null, 'no change');

    lastLog = null;
    compareParameters({ fruit: null }, { fruit: null });
    assert.deepEqual(lastLog, null, 'no change');

    lastLog = null;
    compareParameters({ fruit: '' }, { fruit: '' });
    assert.deepEqual(lastLog, null, 'no change');

    lastLog = null;
    compareParameters({ fruit: 0 }, { fruit: 0 });
    assert.deepEqual(lastLog, null, 'no change');

    lastLog = null;
    compareParameters({ fruit: 'banana' }, { fruit: 'orange' });
    assert.ok(
        lastLog.indexOf('-  fruit: "banana"') !== -1 &&
        lastLog.indexOf('+  fruit: "orange"') !== -1, '- banana, + orange');

    lastLog = null;
    compareParameters({}, { fruit: 'orange' });
    assert.ok(lastLog.indexOf('+  fruit: "orange"') !== -1, '+ orange');

    lastLog = null;
    compareParameters({ fruit: 'banana' }, {});
    assert.ok(lastLog.indexOf('-  fruit: "banana"') !== -1, '- banana');

    console.log = origLog;
    assert.end();
});

