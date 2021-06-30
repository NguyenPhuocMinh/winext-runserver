'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');
const lodash = winext.require('lodash');
const dotenv = winext.require('dotenv');
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
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const { get, isFunction } = lodash;
const { name, version } = require('../package.json');

function Server(params = {}) {
  // express
  const app = express();

  const config = get(params, 'config');
  const requestId = get(params, 'requestId');
  const repository = get(params, 'repository');
  const mappingStore = get(params, 'mappingStore');
  const loggerFactory = get(params, 'loggerFactory');
  const loggerTracer = get(params, 'loggerTracer');

  const enable = get(config, 'enable', false);
  const contextPath = get(config, 'contextPath');
  const protocol = enable ? process.env.PROTOCOL || 'https' : 'http';
  const portServer = process.env.PORT || get(config, 'port') || 8080;
  const hostServer = process.env.HOST || get(config, 'host') || '0.0.0.0';
  // options swagger
  const swaggerOptions = get(config, 'swaggerOptions', {});

  const options = {
    key: fs.readFileSync(path.resolve(__dirname, '../data', 'key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../data', 'cert.pem'))
  };

  // Create HTTP Server Instances
  const server = enable ? https.createServer(options, app) : http.createServer(app);
  app.use(cors());
  app.use(morgan('dev'));
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
  // config env
  dotenv.config();

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
        loggerTracer.info(`Load ${name}-${version} successfully!`)
        const port = serverInstance.address().port;
        const host = serverInstance.address().address;
        console.info('The server is running on %s://%s:%s', protocol, host, port);
        loggerFactory.info(`Context Path : ${contextPath}`, {
          requestId: `${requestId}`
        });
        loggerFactory.info(`The server start with: ${protocol}://${host}:${port}${contextPath}`, {
          requestId: `${requestId}`
        });
        const swaggerDocs = swaggerJsDoc(swaggerOptions);
        app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));
      });
      resolve(serverInstance);
    })
      .then(info => {
        Server.call(
          repository.startMongoose(),
          repository.startMySql(),
          mappingStore.mapping(app, router)
        );
        return info;
      })
      .catch(err => {
        loggerFactory.error(`Start server has error : ${err}`, {
          requestId: `${requestId}`,
          args: { err }
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
      loggerTracer.debug(`Shutdown time out ${timeOut}`)
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
        Server.call(
          repository.closeMongoose(),
          repository.closeMySql()
        );
        process.exit(0);
      })
      .catch(err => {
        loggerFactory.error(`The Server Stop Has Error : ${err}`, {
          requestId: `${requestId}`,
          args: { err }
        });
        return Promise.reject(err)
      });
  };

  this.app = app;
  this.router = router;
};

exports = module.exports = new Server();
exports.register = Server;