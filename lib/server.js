'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');
const lodash = winext.require('lodash');
const dotenv = winext.require('dotenv');
const chalk = winext.require('chalk');
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
const helmet = require('helmet');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const { get, isFunction, isEmpty } = lodash;
const { name, version } = require('../package.json');

function Server(params = {}) {
  // express
  const app = express();

  const config = get(params, 'config');
  const requestId = get(params, 'requestId');
  const repository = get(params, 'repository');
  const registry = get(params, 'registry');
  const gateway = get(params, 'gateway');
  const gatewayConfig = get(params, 'gatewayConfig');
  const mappingStore = get(params, 'mappingStore');
  const redisStore = get(params, 'redisStore');
  const loggerFactory = get(params, 'loggerFactory');
  const loggerTracer = get(params, 'loggerTracer');

  const enable = get(config, 'enable', false);
  const contextPath = process.env.CONTEXT_PATH || get(config, 'contextPath');
  const protocol = enable ? process.env.PROTOCOL || 'https' : 'http';
  const portServer = process.env.SERVER_PORT || get(config, 'port') || 8080;
  const hostServer = process.env.SERVER_HOST || get(config, 'host') || '0.0.0.0';
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
  app.use(helmet());
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
  app.use(express.static(path.join(__dirname, 'build')));
  // config env
  dotenv.config();

  /**
   * Start Server
   */
  this.startServer = function () {
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen(portServer, hostServer, (err) => {
        if (err) {
          loggerFactory.error(`Start server has error :${err}`, {
            requestId: `${requestId}`
          });
          reject(err);
        }
        loggerTracer.info(chalk.green(`Load ${name}-${version} successfully!`));
        const port = serverInstance.address().port;
        const host = serverInstance.address().address;
        console.log(chalk.magenta.underline(`The server is running on, ${protocol}://${host}:${port}`));
        loggerFactory.info(`Context Path : ${contextPath}`, {
          requestId: `${requestId}`
        });
        loggerFactory.info(`The server start with: ${protocol}://${host}:${port}${contextPath}`, {
          requestId: `${requestId}`
        });
        if (!isEmpty(swaggerOptions)) {
          loggerTracer.info(chalk.green('Connected swagger options successfully!'));
          const swaggerDocs = swaggerJsDoc(swaggerOptions);
          loggerTracer.fatal(chalk.magenta(`Swagger info: ${JSON.stringify(swaggerDocs.info, null, 1)}`));
          app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));
        } else {
          loggerTracer.warn(chalk.yellow('Not connect swagger options'));
        }

        const enableKongGateWay = get(gatewayConfig, 'kong.enable', false);
        if (isEmpty(gatewayConfig) || !enableKongGateWay) {
          loggerTracer.warn(chalk.yellow('No Gateway enable'));
        } else {
          app.use(contextPath,
            gateway.createService,
            gateway.createRouter,
            gateway.createConsumer,
            gateway.createPlugin,
            gateway.authGateway
          );
        }
      });
      resolve(serverInstance);
    })
      .then(info => {
        Server.call(
          repository.startMongo(),
          repository.startMySql(),
          registry.initServices(),
          registry.registerServices(),
          mappingStore.mapping(app, router),
          redisStore.startRedis(),
        );
        return info;
      })
      .catch(err => {
        loggerFactory.error(`Start server has error : ${err}`, {
          requestId: `${requestId}`,
          args: { err }
        });
        return Promise.reject(err);
      });
  };

  /**
   * Stop Server
   */
  this.stopServer = function () {
    return new Promise(function (resolve, reject) {
      const timeOut = setTimeout(function () {
        reject();
      }, 3000);
      loggerTracer.warn(chalk.yellow(`Shutdown time out ${timeOut}`));
      const serverClose = function () {
        if (server && isFunction(serverClose)) {
          server.removeListener('close', serverClose);
        }
      };

      server.on('close', serverClose);
      server.close(function (err) {
        clearTimeout(timeOut);
        resolve(err);
      });
      loggerFactory.warn(`The server has been stop`, {
        requestId: `${requestId}`
      });
    })
      .then(() => {
        Server.call(
          repository.stopMongo(),
          repository.closeMySql(),
          redisStore.stopRedis(),
        );
        process.exit(0);
      })
      .catch(err => {
        loggerFactory.error(`The Server Stop Has Error : ${err}`, {
          requestId: `${requestId}`,
          args: { err }
        });
        return Promise.reject(err);
      });
  };

  this.app = app;
  this.router = router;
}

exports = module.exports = new Server();
exports.register = Server;
