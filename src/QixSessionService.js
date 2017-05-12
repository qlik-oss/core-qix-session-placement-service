const containerized = require('containerized');
const createError = require('http-errors');
const engineDiscoveryClient = require('./EngineDiscoveryClient');
const engineSessionPrepper = require('./DocPrepper');
const engineLoadBalancer = require('./LoadBalancer');

function engineToAddress(engine) {
  if (containerized()) {
    return engine.addresses[0];
  }
  return {
    ipAddress: '10.0.75.1',
    port: '9076'
  };
}

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
      throw createError(503, 'No suitable QIX Engine available');
    }

    const engineAddress = engineToAddress(engine);

    try {
      // Prepare the session
      const sessionId = await engineSessionPrepper.prepareDoc(engineAddress.ipAddress, engineAddress.port, docId);
      return Object.assign({}, engineAddress, { sessionId });
    } catch (err) {
      throw createError(404, 'Document not found');
    }
  }
}

module.exports = QixSessionService;
