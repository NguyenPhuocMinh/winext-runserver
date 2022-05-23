'use strict';

const helmet = require('helmet');
const profiles = require('../conf/profiles');

module.exports = helmet({
  crossOriginEmbedderPolicy: profiles.isProduction,
  contentSecurityPolicy: profiles.isProduction,
});
