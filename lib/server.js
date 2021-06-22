'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');
const lodash = winext.require('lodash');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const process = require('process');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mappingTrigger = require('../utils/mappingTrigger');
const errorManager = require('../utils/errorManager');
const { get, isFunction } = lodash;

function Server(params = {}) {
  // express
  const app = express();

  const config = get(params, 'config');
  const requestId = get(params, 'requestId');
  const repository = get(params, 'repository');
  const loggerFactory = get(params, 'loggerFactory');

  const enable = get(config, 'enable', false);
  const contextPath = get(config, 'contextPath');
  const protocol = enable ? process.env.PROTOCOL || 'https' : 'http';
  const portServer = process.env.PORT || get(config, 'port') || 8080;
  const hostServer = process.env.HOST || get(config, 'host') || '0.0.0.0';

  const options = {
    key: fs.readFileSync(path.resolve(__dirname, '../data', 'key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../data', 'cert.pem'))
  }

  // Create HTTP Server Instances
  const server = enable ? https.createServer(options, app) : http.createServer(app);

  app.use(cors());
  app.use(morgan('dev'));
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  // Start Server
  this.startup = function () {
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen(portServer, hostServer, (err) => {
        if (err) {
          loggerFactory.error(`Start server has error :${err}`, {
            requestId: `${requestId}`
          })
          reject(err);
        };
        const port = serverInstance.address().port;
        const host = serverInstance.address().address;
        console.info('The server is running on %s://%s:%s', protocol, host, port);
        loggerFactory.info(`Context Path : ${contextPath}`, {
          requestId: `${requestId}`
        });
        loggerFactory.info(`The server start with: ${protocol}://${host}:${port}${contextPath}`, {
          requestId: `${requestId}`
        });
      });
      resolve(serverInstance);
    })
      .then(info => {
        Server.call(repository.startMongoose(), repository.startMySql(), mappingTrigger.mapping(app, router));
        return info;
      })
      .catch(err => {
        loggerFactory.error(`Start server has error : ${err}`, {
          requestId: `${requestId}`,
        })
        return Promise.reject(err);
      });
  };

  // Stop Server
  this.shutdown = function () {
    return new Promise(function (resolve, reject) {
      const timeOut = setTimeout(function () {
        reject();
      }, 3000);
      const serverClose = function () {
        if (server && isFunction(serverClose)) {
          server.removeListener('close', serverClose)
        }
      }

      server.on('close', serverClose)
      server.close(function (err) {
        clearTimeout(timeOut)
        resolve(err);
      });
      loggerFactory.warn(`The server has been stop`, {
        requestId: `${requestId}`
      });
    })
      .then(() => {
        Server.call(repository.closeMongoose(), repository.closeMySql());
        process.exit(0);
      })
      .catch(err => {
        loggerFactory.error(`The Server Stop Has Error : ${err}`, {
          requestId: `${requestId}`,
        });
        return Promise.reject(err)
      });
  };

  this.app = app;
  this.router = router;
  this.mappingTrigger = mappingTrigger;
  this.errorManager = errorManager;
};

exports = module.exports = new Server();
exports.register = Server;