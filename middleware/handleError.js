'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');

function handleError(params = {}) {
  const { err, response, requestId, loggerFactory } = params;

  loggerFactory.error(`function handleError has error`,
    { requestId: `${requestId}` }
  );

  if (err instanceof Error) {
    loggerFactory.warn(`error has type Error`, {
      requestId: `${requestId}`,
    });
    response.status(500).send({
      name: err.name,
      message: err.message
    })
    return Promise.reject(err);
  } else {
    loggerFactory.warn(`error has not type Error`, { requestId: `${requestId}` });
    const { name, message, statusCode, returnCode } = err;
    response.status(statusCode).set({ 'X-Return-Code': returnCode }).send({
      name: name,
      message: message
    })
    return Promise.reject(JSON.stringify(err));
  }
};

module.exports = handleError;
