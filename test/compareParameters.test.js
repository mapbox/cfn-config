var tape = require('tape');
var util = require('util');
var config = require('../index.js');
var compareParameters = config.compareParameters;

tape('compareParameters', function(assert) {
    var origLog = console.log;
    var lastLog = null;
    console.log = function() {
        origLog.apply(console, arguments);
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
    assert.deepEqual(lastLog, 'Change parameter fruit from banana to orange', '-banana, +orange');

    lastLog = null;
    compareParameters({}, { fruit: 'orange' });
    assert.deepEqual(lastLog, 'Add parameter fruit with value orange', '+orange');

    lastLog = null;
    compareParameters({ fruit: 'banana' }, {});
    assert.deepEqual(lastLog, 'Remove parameter fruit with value banana', '-banana');

    console.log = origLog;
    assert.end();
});

