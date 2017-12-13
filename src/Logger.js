const winston = require('winston');

/**
 * Class providing a shared logger instance to be used in all files.
 */
class Logger {
  /**
   * Gets the shared logger instance.
   * @returns {Object} - The logger object.
   */
  static get() {
    if (!Logger.logger) {
      Logger.logger = new (winston.Logger)({
        transports: [
          new (winston.transports.Console)({
            level: process.env.LOG_LEVEL || 'info',
            humanReadableUnhandledException: true,
            formatter: options => JSON.stringify({
              logseverity: options.level.toUpperCase(),
              message: options.message,
              timestamp: new Date(Date.now()).toISOString(),
            }),
          }),
        ],
      });
    }
    return Logger.logger;
  }
}

module.exports = Logger;
