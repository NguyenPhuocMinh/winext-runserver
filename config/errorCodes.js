'use strict';

const errorCodes = {
  InvalidSwaggerType: {
    message: 'Swagger type one of kind OPTIONS, YAML',
    returnCode: 5000,
    statusCode: 400,
  },
};

module.exports = errorCodes;
