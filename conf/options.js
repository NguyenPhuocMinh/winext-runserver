'use strict';

const fs = require('fs');
const path = require('path');

const options = {};

const server = {
  key: fs.readFileSync(path.resolve(__dirname, '../data', 'key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '../data', 'cert.pem')),
};

const swaggerType = {
  options: 'OPTIONS',
  yaml: 'YAML',
};

options.server = server;
options.swaggerType = swaggerType;

module.exports = options;
