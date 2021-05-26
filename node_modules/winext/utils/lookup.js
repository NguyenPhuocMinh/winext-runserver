'use strict';

const { dependencies } = require('../package.json');

function LookupRequire(pgkName = '') {
  let exports = null;
  if (dependencies.hasOwnProperty(pgkName)) {
    exports = require(pgkName);
  }
  return exports;
};

module.exports = LookupRequire;