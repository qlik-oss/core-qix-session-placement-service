const logger = require('./Logger').get();

class Config {
  static init() {
    Config.miraHostName = process.env.MIRA_HOSTNAME || (process.env.SESSION_SERVICE_CONTAINERIZED && process.env.SESSION_SERVICE_CONTAINERIZED.toLowerCase() === 'true' ? 'mira' : 'localhost');
    Config.miraPort = 9100;

    Config.sessionStrategy = process.env.SESSION_STRATEGY || 'leastload';
    const SUPPORTED_STRATEGIES = ['leastload', 'roundrobin'];

    if (SUPPORTED_STRATEGIES.indexOf(Config.sessionStrategy) === -1) {
      throw new Error(`Incorrect session strategy. Supported session strategies are: ${SUPPORTED_STRATEGIES.join(', ')}`);
    }
    logger.info(`QIX Session Service is running with session strategy ${Config.sessionStrategy}`);

    this.port = parseInt(process.env.PORT, 10);
    if (!this.port || isNaN(this.port)) {
      this.port = 9455;
    }

    Config.sessionsPerEngineThreshold = parseInt(process.env.SESSIONS_PER_ENGINE_THRESHOLD, 10);
    if (Config.sessionsPerEngineThreshold && !isNaN(Config.sessionsPerEngineThreshold)) {
      logger.info(`Session service has been configured to not place new sessions on an engine exceeding ${Config.sessionsPerEngineThreshold} active sessions`);
    }
  }
}

module.exports = Config;
