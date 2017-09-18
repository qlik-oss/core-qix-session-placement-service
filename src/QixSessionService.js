const createError = require('http-errors');
const engineDiscoveryClient = require('./EngineDiscoveryClient');
const engineSessionPrepper = require('./DocPrepper');
const engineLoadBalancer = require('./LoadBalancer');
const logger = require('./Logger').get();

class QixSessionService {
  /**
   * Picks an engine
   * @param docId
   * @returns {Promise<TResult>}
   */
  static async openSession(docId, jwt) {
    // Get list of engines
    let engines = await engineDiscoveryClient.listEngines();
    // Only load balance on healthy engines
    engines = engines.filter(instance => instance.engine.status === 'OK');
    // Select one of them and get the address.
    const instance = engineLoadBalancer.roundRobin(engines);
    if (!instance) {
      logger.error('Engine load balancer did not return an engine instance');
      throw createError(503, 'No suitable QIX Engine available');
    }

    const ipAddress = instance.engine.ip;
    const port = instance.engine.port;

    try {
      // Prepare the session
      const sessionId = await engineSessionPrepper.prepareDoc(ipAddress, port, docId, jwt);
      const sessionInfo = { ipAddress, port, sessionId };
      if (docId.length !== 0) { sessionInfo.docId = docId; }
      logger.info('Session opened', sessionInfo);
      return sessionInfo;
    } catch (err) {
      logger.error('Failed to open session', { ipAddress, port, docId });
      throw createError(404, 'Document not found');
    }
  }
}

module.exports = QixSessionService;
