const engineDiscoveryClient = require('./EngineDiscoveryClient');
const engineSessionPrepper = require('./DocPrepper');
const engineLoadBalancer = require('./LoadBalancer');
const logger = require('./Logger').get();
const createError = require('http-errors');
const Config = require('./Config');

class QixSessionService {
  /**
   * Picks an engine
   * @param docId
   * @returns {Promise<TResult>}
   */
  static async openSession(docId, jwt) {
    // Get list of engines
    let engines;
    try {
      engines = await engineDiscoveryClient.listEngines();
    } catch (err) {
      logger.error('Engine Discovery client did not return an engine instance');
      throw createError(503, 'No suitable QIX Engine available');
    }
    // Only load balance on healthy engines
    engines = engines.filter(instance => instance.engine.status === 'OK');
    // Select one of them and get the address.
    let instance;

    if (Config.sessionStrategy === 'roundrobin') {
      instance = engineLoadBalancer.roundRobin(engines);
    } else {
      instance = engineLoadBalancer.leastLoad(engines);
    }

    if (!instance) {
      logger.error('Engine load balancer did not return an engine instance');
      throw createError(503, 'No suitable QIX Engine available');
    }

    const {
      ip,
      port,
    } = instance.engine;

    logger.info(`Opening session against engine at ${ip}:${port}`);

    try {
      // Prepare the session
      const sessionId = await engineSessionPrepper.prepareDoc(ip, port, docId, jwt);
      const sessionInfo = {
        ip,
        port,
        sessionId,
      };

      if (docId.length !== 0) {
        sessionInfo.docId = docId;
        logger.info(`Session with session id ${sessionInfo.sessionId} opened for doc ${sessionInfo.docId} on qix engine ${sessionInfo.ip}:${sessionInfo.port}`);
      } else {
        logger.info(`Session with session id ${sessionInfo.sessionId} opened on qix engine ${sessionInfo.ip}:${sessionInfo.port}`);
      }

      return sessionInfo;
    } catch (err) {
      logger.error(`Failed to open session on qix engine ${ip}:${port}`);
      throw createError(503, `Failed to open session on qix engine ${ip}:${port}`);
    }
  }
}

module.exports = QixSessionService;
