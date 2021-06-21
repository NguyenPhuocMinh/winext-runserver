'use strict';

const winext = require('winext');
const Promise = winext.require('bluebird');
const lodash = winext.require('lodash');
const handleMapping = require('../middleware/handleMapping');
const errorManager = require('./errorManager');
const { get, isEmpty, isArray, toLower } = lodash;

function MappingTrigger(params = {}) {

  const config = get(params, 'config');
  const mappings = get(params, 'mappings', []);
  const requestId = get(params, 'requestId');
  const repository = get(params, 'repository');
  const authorization = get(params, 'authorization');
  const loggerFactory = get(params, 'loggerFactory');

  const contextPath = get(config, 'contextPath');

  this.mapping = async function (app, router) {
    loggerFactory.info(`Mapping has been start`, {
      requestId: `${requestId}`,
    })

    /**
     * check token middleware
     */
    if(!isEmpty(authorization)) {
      app.use(contextPath,
        authorization.noVerifyToken,
        authorization.verifyTokenMiddleware,
        authorization.publicRouters,
        authorization.protectedRouters
      );
    }
    /**
     *  mappings
     */
    return new Promise((resolve, reject) => {
      if (isEmpty(mappings)) {
        reject('mapping not found');
      }
      if (!isEmpty(mappings) && isArray(mappings)) {
        for (let i = 0; i < mappings.length; i++) {
          const serviceParams = {};
          const service = get(mappings[i], 'serviceName');

          if (service['register'].hasOwnProperty('reference')) {
            const reference = service['register'].reference;
            if (reference.hasOwnProperty('dataStore')) {
              const _dataStore = reference['dataStore'];
              if (_dataStore === 'app-repository/dataStore') {
                serviceParams.dataStore = repository.dataStore;
              }
            }
            if (reference.hasOwnProperty('errorManager')) {
              const _errorManager = reference['errorManager'];
              if (_errorManager === 'app-runserver/errorManager') {
                serviceParams.errorManager = errorManager;
              }
            }
            service['register'](serviceParams);
          }
        }

        return mappings.map(mapping => {
          const method = get(mapping, 'method')
          const pathName = get(mapping, 'pathName');
          const serviceName = get(mapping, 'serviceName');
          const methodName = get(mapping, 'methodName');
          const input = get(mapping, 'input') || {};
          const output = get(mapping, 'output') || {};
          const service = serviceName[methodName];

          if (isEmpty(method)) {
            reject('method not found');
          };

          app.use(contextPath, router[toLower(method)](pathName, (
            request, response, next) => handleMapping({
              request, response,
              input, output, service,
              requestId, loggerFactory
            })
          ));
        })
      }
      resolve(app);
    })
      .then(info => {
        loggerFactory.data(`Connect mapping has complete`, {
          requestId: `${requestId}`,
        })

        return info;
      })
      .catch(err => {
        loggerFactory.error(`Mapping has error : ${err}`, {
          requestId: `${requestId}`
        })
        return Promise.reject(err);
      });
  }
};

exports = module.exports = new MappingTrigger();
exports.register = MappingTrigger;
