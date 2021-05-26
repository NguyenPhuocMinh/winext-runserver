'use strict';

const buffer = require('buffer').Buffer;
const uuid = require('uuid');

const requestId = uuid.v4(null, buffer.alloc(16))
  .toString('base64')
  .replace(/\//g, '_')
  .replace(/\+/g, '-')
  .substring(0, 22);
;

module.exports = requestId;