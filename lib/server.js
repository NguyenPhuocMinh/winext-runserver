'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');
const lodash = winext.require('lodash');
const logger = winext.require('winext-logger');
const https = require('https');
const http = require('http');
const path = require('path');
const process = require('process');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const { get, isFunction, isEmpty } = lodash;

const options = require('../conf/options');
const profiles = require('../conf/profiles');
const errorCodes = require('../config/errorCodes');

const loggerMiddleware = logger.loggerMiddleware;
const sessionMiddleware = require('../middlewares/session');
const helmetMiddleware = require('../middlewares/helmet');
const requestIdMiddleware = require('../middlewares/requestId');

function Server(params = {}) {
  // express
  const app = express();

  const config = get(params, 'config');
  const repoStore = get(params, 'repoStore');
  const redisStore = get(params, 'redisStore');
  const mappingStore = get(params, 'mappingStore');
  const apiGateway = get(params, 'apiGateway');
  const serviceRegistry = get(params, 'serviceRegistry');
  const gatewayConfig = get(params, 'gatewayConfig');
  const serviceRegistryConfig = get(params, 'serviceRegistryConfig');
  const loggerTracer = get(params, 'loggerTracer');
  const errorManager = get(params, 'errorManager');

  const enable = get(config, 'enable', false);
  const contextPath = profiles.contextPath || get(config, 'contextPath');
  const clientUIPath = profiles.clientUIPath || get(config, 'clientUIPath');
  const portServer = profiles.portServer || get(config, 'port') || 8080;
  const hostServer = profiles.hostServer || get(config, 'host') || '0.0.0.0';
  const protocol = profiles.protocol;

  // options swagger
  const dialectSwagger = get(config, 'dialectSwagger', options.swaggerType.options);
  const swaggerOptions = get(config, 'swaggerOptions', {});
  const swaggerYaml = get(config, 'swaggerYaml');
  const pathDocs = profiles.docsPath || get(config, 'pathDocs', '/api-docs');

  // Create HTTP Server Instances
  const server = enable ? https.createServer(options.server, app) : http.createServer(app);

  app.use(cors({ credentials: true, origin: [clientUIPath] }));
  app.use(cookieParser());
  app.use(morgan(loggerMiddleware));
  app.use(helmetMiddleware);
  app.use(sessionMiddleware);
  app.use(requestIdMiddleware());
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
  app.use(express.static(path.join(__dirname, 'build')));

  /**
   * Start Server
   */
  this.startServer = async function () {
    try {
      await repoStore.startMongo();
      await repoStore.startMySql();
      await repoStore.startGraphql(app, server, profiles.pathServer);
      mappingStore.mapping(app, router);

      const serverInstance = server.listen(portServer, hostServer, (err) => {
        if (err) {
          loggerTracer.error(`Start server has been error`, {
            args: err,
          });
          throw err;
        }

        loggerTracer.info(`Server has been start !!!`);

        const port = serverInstance.address().port;
        const host = serverInstance.address().address;
        const baseUrl = `${protocol}://${host}:${port}`;

        /**
         * Swagger
         */
        if (!isEmpty(dialectSwagger)) {
          switch (dialectSwagger) {
            case options.swaggerType.options: {
              if (isEmpty(swaggerOptions)) {
                loggerTracer.silly('Load swagger options fail!');
                throw errorManager.newError('SwaggerOptionsIsEmpty', errorCodes);
              } else {
                loggerTracer.info('Load swagger options successfully!');
                const swaggerDocs = swaggerJsDoc(swaggerOptions);
                app.use(pathDocs, swaggerUI.serve, swaggerUI.setup(swaggerDocs));
                loggerTracer.info(`Docs path`, {
                  args: `${baseUrl}${pathDocs}`,
                });
              }
              break;
            }
            case options.swaggerType.yaml:
              if (isEmpty(swaggerYaml)) {
                loggerTracer.silly('Load swagger yaml fail!');
                throw errorManager.newError('SwaggerYamlIsEmpty', errorCodes);
              } else {
                loggerTracer.info('Load swagger yaml successfully!');
                app.use(pathDocs, swaggerUI.serve, swaggerUI.setup(swaggerYaml));
                loggerTracer.info(`Docs path`, {
                  args: `${baseUrl}${pathDocs}`,
                });
              }
              break;
            default:
              loggerTracer.silly('Load swagger fail!');
              if (dialectSwagger !== (options.swaggerType.options || options.swaggerType.yaml)) {
                throw errorManager.newError('InvalidSwaggerType', errorCodes);
              }
              break;
          }
        } else {
          loggerTracer.silly('Load swagger fail!');
        }
        /**
         * Api gateway
         */
        const enableKongGateWay = get(gatewayConfig, 'kong.enable', false);
        if (isEmpty(gatewayConfig) || !enableKongGateWay) {
          loggerTracer.silly('Load api gateway fail!');
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
          loggerTracer.silly('Load service registry fail!');
        } else {
          app.use(contextPath, serviceRegistry.initServices, serviceRegistry.registerServices);
        }

        loggerTracer.http(`The server is running on`, {
          args: baseUrl,
        });
      });
    } catch (err) {
      loggerTracer.error(`The server has error`, {
        args: err,
      });
      return Promise.reject(err);
    }
  };

  /**
   * Stop Server
   */
  this.stopServer = function () {
    return new Promise(function (resolve, reject) {
      const timeOut = setTimeout(function () {
        reject();
      }, 3000);
      loggerTracer.info(`Shutdown server timeout ${timeOut} ms`);
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
        Server.call(
          repoStore.stopMongo(),
          repoStore.stopMySql(),
          repoStore.stopGraphql(server),
          redisStore.stopRedis()
        );
        loggerTracer.warn(`Server has been close !!!`);
        process.exit(0);
      })
      .catch((err) => {
        loggerTracer.error(`Server stop has error: ${err}`, {
          args: err,
        });
        process.exit(0);
      });
  };

  this.app = app;
  this.router = router;
}

exports = module.exports = new Server();
exports.register = Server;
