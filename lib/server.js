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
  const repoStore = get(params, 'repoStore');
  const mappingStore = get(params, 'mappingStore');
  const redisStore = get(params, 'redisStore');
  const apiGateway = get(params, 'apiGateway');
  const serviceRegistry = get(params, 'serviceRegistry');
  const gatewayConfig = get(params, 'gatewayConfig');
  const serviceRegistryConfig = get(params, 'serviceRegistryConfig');
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
    cert: fs.readFileSync(path.resolve(__dirname, '../data', 'cert.pem')),
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
            requestId: `${requestId}`,
            args: { err },
          });
          reject(err);
        }
        loggerTracer.info(chalk.green.bold(`Load start server ${name}-${version} successfully!`));
        const port = serverInstance.address().port;
        const host = serverInstance.address().address;

        /**
         * Swagger
         */
        if (!isEmpty(swaggerOptions)) {
          loggerTracer.info(chalk.green.bold('Load swagger options successfully!'));
          const swaggerDocs = swaggerJsDoc(swaggerOptions);
          app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));
          loggerTracer.info(chalk.green.bold(`Api docs path: ${protocol}://${host}:${port}/api-docs`));
        } else {
          loggerTracer.warn(chalk.yellow.bold('Load swagger options fail!'));
        }
        /**
         * Api gateway
         */
        const enableKongGateWay = get(gatewayConfig, 'kong.enable', false);
        if (isEmpty(gatewayConfig) || !enableKongGateWay) {
          loggerTracer.warn(chalk.yellow.bold('Load api gateway fail!'));
        } else {
          app.use(
            contextPath,
            apiGateway.createService,
            apiGateway.createRouter,
            apiGateway.createConsumer,
            apiGateway.createPlugin,
            apiGateway.authGateway
          );
        }
        /**
         * Service registry
         */
        const enableConsulRegistry = get(serviceRegistryConfig, 'consul.enable', false);
        if (isEmpty(serviceRegistry) || !enableConsulRegistry) {
          loggerTracer.warn(chalk.yellow.bold('Load service registry fail!'));
        } else {
          app.use(contextPath, serviceRegistry.initServices, serviceRegistry.registerServices);
        }

        loggerFactory.info(`ContextPath: ${contextPath}`, {
          requestId: `${requestId}`,
        });

        Server.call(
          repoStore.startMongo(),
          repoStore.startMySql(),
          redisStore.startRedis(),
          mappingStore.mapping(app, router)
        );

        loggerFactory.info(`The server is running on ${protocol}://${host}:${port}${contextPath}`, {
          requestId: `${requestId}`,
        });
      });
      resolve(serverInstance);
    })
      .then((info) => {
        loggerFactory.info(`Server has been start !!!`, {
          requestId: `${requestId}`,
        });
        return info;
      })
      .catch((err) => {
        loggerFactory.error(`Start server has error: ${err}`, {
          requestId: `${requestId}`,
          args: err,
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
      loggerTracer.info(chalk.green.bold(`Load stop server ${name}-${version} successfully!`));
      loggerTracer.info(chalk.green.bold(`Shutdown timeout ${timeOut}`));
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
    })
      .then(() => {
        Server.call(repoStore.stopMongo(), repoStore.stopMySql(), redisStore.stopRedis());
        loggerFactory.warn(`Server has been close !!!`, {
          requestId: `${requestId}`,
        });
        process.exit(0);
      })
      .catch((err) => {
        loggerFactory.error(`Server stop has error: ${err}`, {
          requestId: `${requestId}`,
          args: err,
        });
        return Promise.reject(err);
      });
  };

  this.app = app;
  this.router = router;
}

exports = module.exports = new Server();
exports.register = Server;
