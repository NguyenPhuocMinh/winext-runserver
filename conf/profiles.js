'use strict';

const winext = require('winext');
const dotenv = winext.require('dotenv');
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const contextPath = process.env.CONTEXT_PATH;
const clientUIPath = process.env.CLIENT_PATH;
const docsPath = process.env.DOCS_PATH;

const sessionSecret = process.env.SESSION_SECRET;

const protocol = process.env.PROTOCOL;
const portServer = process.env.SERVER_PORT;
const hostServer = process.env.SERVER_HOST;

const profiles = {
  isProduction,
  contextPath,
  clientUIPath,
  sessionSecret,
  docsPath,
  protocol,
  portServer,
  hostServer,
};

module.exports = profiles;
