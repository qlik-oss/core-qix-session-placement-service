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
  static async openSession(docId) {
    // Get list of possible engines
    const engines = await engineDiscoveryClient.queryEngines('');

    // Select one of them and get the address.
    const engine = engineLoadBalancer.roundRobin(engines);

    if (!engine) {
      logger.error('Engine load balancer did not return an engine');
      throw createError(503, 'No suitable QIX Engine available');
    }

    const { ipAddress, port } = engine;

    try {
      // Prepare the session
      const sessionId = await engineSessionPrepper.prepareDoc(ipAddress, port, docId);
      const sessionInfo = { ipAddress, port, sessionId };
      logger.info('Session opened', sessionInfo);
      return sessionInfo;
    } catch (err) {
      logger.error('Failed to open session', { ipAddress, port, docId });
      throw createError(404, 'Document not found');
    }
  }
}

module.exports = QixSessionService;
