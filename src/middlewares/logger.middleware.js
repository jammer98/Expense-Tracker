import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';

const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} errored - ${err.message}`,
});

export default httpLogger;