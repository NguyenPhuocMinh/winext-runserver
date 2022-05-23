'use strict';

const session = require('express-session');
const profiles = require('../conf/profiles');

const memoryStore = new session.MemoryStore();

module.exports = session({
  secret: profiles.sessionSecret,
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
});
