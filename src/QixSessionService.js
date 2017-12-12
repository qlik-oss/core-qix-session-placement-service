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
    try {
      // Get list of engines
      let engines = await engineDiscoveryClient.listEngines();
      // Only load balance on healthy engines
      engines = engines.filter(instance => instance.engine.status === 'OK');
      // Select one of them and get the address.
      const instance = engineLoadBalancer.roundRobin(engines);
      if (!instance) {
        logger.error('Engine load balancer did not return an engine instance');
        throw new Error(503, 'No suitable QIX Engine available');
      } else {
        const {
          ip,
          port,
        } = instance.engine;

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
          }
          logger.info('Session opened', sessionInfo);
          return sessionInfo;
        } catch (err) {
          logger.error('Failed to open session', {
            ip,
            port,
            docId,
          });
          throw new Error(404, 'Document not found');
        }
      }
    } catch (err) {
      logger.error(`Failed to open a session with error: ${err}`);
      return undefined;
    }
  }
}

module.exports = QixSessionService;
