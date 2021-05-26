'use strict';

const lodash = require('lodash');
const process = require('process');
const lookup = require('../utils/lookup');
const requestId = require('../utils/requestId');
const { get, isEmpty } = lodash;

const winnext = {};

function initializer(sandbox = {}, dependencies = [], models) {
  const { application } = sandbox;

  if (!isEmpty(application)) {
    const plugins = get(application, 'dependencies', {});
    if (!isEmpty(plugins)) {
      const app_runserver = get(plugins, 'app_runserver', {});
      if (isEmpty(app_runserver)) {
        console.info('app-runserver config sandbox not found');
        process.exit(0);
      }
      const app_repository = get(plugins, 'app_repository', {});
      if (isEmpty(app_repository)) {
        console.info('app-repository config sandbox not found');
        process.exit(0);
      }
    }
  } else {
    console.info('application not found in config sandbox');
    process.exit(0);
  }

  if (isEmpty(dependencies)) {
    console.info('dependencies not found');
    process.exit(0);
  }

  if (!models) {
    console.info('models not found');
    process.exit(0);
  }

  return building({ sandbox, dependencies, models });
};

function building(params = {}) {
  const __app__ = {};

  const sandboxConfig = get(params, 'sandbox', {});
  const dependencyPlugins = get(params, 'dependencies', []);

  /**
   * config
   */
  const dependencyConfig = get(sandboxConfig, 'application.dependencies');
  const loggerConfig = get(dependencyConfig, 'app_logger');
  const serverConfig = get(dependencyConfig, 'app_runserver');
  const repositoryConfig = get(dependencyConfig, 'app_repository');
  const authorizationConfig = get(dependencyConfig, 'app_authorization');

  const routerMappingsConfig = get(sandboxConfig, 'application.routerMappings');
  const errorCodesConfig = get(sandboxConfig, 'application.errorCodes');

  for (let i = 0; i < dependencyPlugins.length; i++) {

    /**
     * logger
     */
    const app_logger = get(dependencyPlugins[i], 'app_logger');

    if (!isEmpty(app_logger)) {

      const loggerParams = {
        config: loggerConfig,
      };

      app_logger.register(loggerParams);

      __app__.logger = app_logger;
    }
    /**
     *  repository
     */
    const app_repository = get(dependencyPlugins[i], 'app_repository');

    if (!isEmpty(app_repository)) {

      const repoParams = {
        config: repositoryConfig,
        requestId: requestId,
        loggerFactory: __app__.logger.getLogger('app_repository'),
      };

      const triggerParams = {
        requestId: requestId,
        loggerFactory: __app__.logger.getLogger('trigger'),
      };

      app_repository.register(repoParams);
      app_repository.dataStore.register(triggerParams);

      __app__.repository = {
        start: () => app_repository.startupMongoose(),
        close: () => app_repository.shutdownMongoose(),
        dataStore: app_repository.dataStore
      };
    }

    /**
     * authentication
     */
    const app_authorization = get(dependencyPlugins[i], 'app_authorization');

    if (!isEmpty(app_authorization)) {

      const authorizationParams = {
        config: authorizationConfig,
        requestId: requestId,
        loggerFactory: __app__.logger.getLogger('app_authorization')
      }

      app_authorization.register(authorizationParams);

      __app__.authorization = app_authorization;
    }

    /**
     * run server
     */
    const app_runserver = get(dependencyPlugins[i], 'app_runserver');

    if (!isEmpty(app_runserver)) {

      const serverParams = {
        config: serverConfig,
        requestId: requestId,
        repository: __app__.repository,
        loggerFactory: __app__.logger.getLogger('app_runserver'),
      };

      const mappingTriggerParams = {
        config: serverConfig,
        mappings: routerMappingsConfig,
        requestId: requestId,
        repository: __app__.repository,
        authorization: __app__.authorization,
        loggerFactory: __app__.logger.getLogger('mapping_trigger')
      };

      const errorManagerParams = {
        errorCodes: errorCodesConfig,
        requestId: requestId,
        loggerFactory: __app__.logger.getLogger('error_manager')
      };

      app_runserver.register(serverParams);
      app_runserver.mappingTrigger.register(mappingTriggerParams);
      app_runserver.errorManager.register(errorManagerParams);

      __app__.server = {
        start: () => app_runserver.startup(),
        close: () => app_runserver.shutdown(),
      };
    }
  }

  return __app__;
};

winnext.initializer = initializer;
winnext.require = lookup;

exports = module.exports = winnext;