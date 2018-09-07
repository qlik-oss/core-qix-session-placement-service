const createError = require('http-errors');
const engineDiscoveryClient = require('./EngineDiscoveryClient');
const engineSessionPrepper = require('./DocPrepper');
const engineLoadBalancer = require('./LoadBalancer');
const logger = require('./Logger').get();
const Config = require('./Config');

class QixSessionService {
  /**
   * Method for initializing metrics for active and remaining sessions
   */
  static async init() {
    try {
      const engines = await engineDiscoveryClient.listEngines();
      engineLoadBalancer.checkMaxSessions(engines);
    } catch (err) {
      logger.error(`Engine Discovery client did not return any engine instances when initializing metrics ${err}`);
    }
  }

  static async getVizceralMetrics() {
    const time = new Date() / 1000;
    let totalSessionCount;
    let engines;
    const metrics = {
      renderer: 'global',
      name: 'edge',
      nodes: [],
      connections: [],
    };

    try {
      engines = await engineDiscoveryClient.listEngines();

      engines.forEach((instance) => {
        const isTerminating = instance.kubernetes
          && instance.kubernetes.pod
          && instance.kubernetes.pod.metadata
          && !!instance.kubernetes.pod.metadata.deletionTimestamp;
        const { engine } = instance;
        const name = isTerminating ? 'TERMINATING' : `QIX-${engine.networks[0].ip}`;

        const sessionMetric = engine.metrics.filter(metric => metric.name === 'qix_active_sessions');

        const activeSessions = sessionMetric[0].metric[0].gauge.value;
        totalSessionCount += activeSessions;

        let level;

        if (isTerminating) {
          level = 'danger';
        } else if (activeSessions >= Config.sessionsPerEngineThreshold) {
          level = 'warning';
        } else {
          level = 'normal';
        }

        const node = {
          renderer: 'region',
          name,
          maxVolume: Config.sessionsPerEngineThreshold * 1000,
          class: level,
          updated: time,
          metadata: {
            sessionCount: activeSessions,
          },
        };

        const connection = {
          source: 'GATEWAY',
          target: name,
          metrics: {
            normal: activeSessions * 1000,
          },
          notices: [
          ],
          class: 'normal',
        };

        metrics.nodes.push(node);
        metrics.connections.push(connection);
      });

      metrics.nodes.push(
        {
          renderer: 'region',
          name: 'GATEWAY',
          class: 'normal',
          metadata: {
            totalSessionCount,
          },
        },
      );

      return metrics;
    } catch (err) {
      logger.error('Engine Discovery client did not return an engine instance when fetching vizcerals');
      throw createError(503, 'No suitable QIX Engine available');
    }
  }

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
    // Select one of them and get the address.
    const instance = engineLoadBalancer.giveMeAnEngine(engines);

    if (!instance) {
      logger.error('Engine load balancer did not return an engine instance');
      throw createError(503, 'No suitable Qlik Associative Engine available');
    }

    const { port } = instance.engine;
    // since qliktive is only using one network
    // we know that we can take the ip of the first network.
    const { ip } = instance.engine.networks[0];

    logger.debug(`Opening session against engine at ${ip}:${port}`);

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
        logger.debug(`Session with session id ${sessionInfo.sessionId} opened for doc ${sessionInfo.docId} on qix engine ${sessionInfo.ip}:${sessionInfo.port}`);
      } else {
        logger.debug(`Session with session id ${sessionInfo.sessionId} opened on qix engine ${sessionInfo.ip}:${sessionInfo.port}`);
      }

      return sessionInfo;
    } catch (err) {
      logger.error(`Failed to open session on qix engine ${ip}:${port}`);
      throw createError(503, `Failed to open session on qix engine ${ip}:${port}`);
    }
  }
}

module.exports = QixSessionService;
