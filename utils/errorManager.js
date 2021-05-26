'use strict';

const winext = require('winext');
const lodash = winext.require('lodash');
const { get } = lodash;

function ErrorManager(params = {}) {
  const errorCodes = get(params, 'errorCodes');
  const requestId = get(params, 'requestId');
  const loggerFactory = get(params, 'loggerFactory');

  this.errorBuilder = function (name = '') {
    loggerFactory.data(`function errorBuilder start`, {
      requestId: `${requestId}`,
      args: name
    })

    const error = {};
    if (errorCodes.hasOwnProperty(name)) {
      loggerFactory.data(`hasOwnProperty name in errorCodes`, {
        requestId: `${requestId}`,
      })
      error.name = name;
      error.message = errorCodes[name].message;
      error.returnCode = errorCodes[name].returnCode;
      error.statusCode = errorCodes[name].statusCode;
    } else {
      loggerFactory.data(`Not hasOwnProperty name in errorCodes`, {
        requestId: `${requestId}`,
      })
      error.name = name;
      error.message = `Error name [${name}] not supported`;
      error.returnCode = 3000;
      error.statusCode = 400
    }

    loggerFactory.data(`function errorBuilder end`, {
      requestId: `${requestId}`,
      args: name
    })

    return error;
  }
};

exports = module.exports = new ErrorManager();
exports.register = ErrorManager;