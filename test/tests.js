var assert = require('assert');

describe("parser", function() {

});

describe("helper", function() {
    var helper = require('../helper');
    var constant = require('../constant');
    describe("#getUrlType", function() {
        it("should classify / as other", function() {
            assert.equal(helper.getUrlType('/'), constant.TYPE_OTHER);
        });
        it("should classify /tv/ as other", function() {
            assert.equal(helper.getUrlType('/tv/'), constant.TYPE_OTHER);
        });
        it("should classify /tv/001 as channel videl", function() {
            assert.equal(helper.getUrlType('/tv/001'), constant.TYPE_CHANNEL);
        });
        it("should classify /tv/001?heihei as other", function() {
            assert.equal(helper.getUrlType('/tv/001?heihei'), constant.TYPE_OTHER);
        });
    });
});
