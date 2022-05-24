'use strict';

const winext = require('winext');
const uuidUtils = winext.uuidUtils;

const ATTRIBUTE_KEY = 'requestID';

const requestIdMiddleware = () => {
  return (req, res, next) => {
    const generator = uuidUtils.generateRequestID;
    const headerName = 'X-Request-Id';

    const oldRequestID = req.get(headerName);
    const requestID = oldRequestID === undefined ? generator() : oldRequestID;

    res.set(headerName, requestID);
    req[ATTRIBUTE_KEY] = requestID;

    next();
  };
};

module.exports = requestIdMiddleware;
