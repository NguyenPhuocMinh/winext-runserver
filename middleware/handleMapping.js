'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');
const lodash = winext.require('lodash');
const handleError = require('./handleError');
const { get, isEmpty, isFunction } = lodash;

function handleMapping(params = {}) {
  const {
    request,
    response,
    input,
    output,
    service,
    requestId,
    loggerFactory
  } = params;

  let argsInput = {};
  let argsOutput = {};

  const opts = {
    requestId: requestId,
    loggerFactory: loggerFactory,
  };

  if (input) {
    if (isFunction(input.transform)) {
      argsInput = input.transform(request, opts);
    }
  }

  return new Promise((resolve, reject) => {
    resolve(argsInput)
  })
    .then(args => {
      return service(args, opts);
    })
    .then(result => {
      if (output) {
        if (isFunction(output.transform)) {
          argsOutput = output.transform(result);
        } else {
          argsOutput = result;
        }
      }
      return argsOutput;
    })
    .then(data => {

      const headers = get(data, 'headers');
      const body = get(data, 'body');

      if (isEmpty(headers) && !isEmpty(body)) {
        return response.status(200).set({ 'X-Return-Code': 0 }).send(body)
      } else if (isEmpty(headers) && isEmpty(body)) {
        return response.status(200).set({ 'X-Return-Code': 0 }).send(data);
      } else {
        headers['X-Return-Code'] = 0;
        return response.status(200).set(headers).send(body);
      }
    })
    .catch(err => {
      handleError({ err, response, requestId, loggerFactory });
    });
};

module.exports = handleMapping;