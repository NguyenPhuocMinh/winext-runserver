'use strict';

const errorCodes = {
  InvalidSwaggerType: {
    message: 'Swagger type one of kind OPTIONS, YAML',
    returnCode: 5000,
    statusCode: 500,
  },
  SwaggerOptionsIsEmpty: {
    message: 'Swagger options not found',
    returnCode: 5001,
    statusCode: 500,
  },
  SwaggerYamlIsEmpty: {
    message: 'Swagger yaml not found',
    returnCode: 5002,
    statusCode: 500,
  },
};

module.exports = errorCodes;
