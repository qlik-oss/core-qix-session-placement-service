const prom = require('http-metrics-middleware').promClient;
const Config = require('./Config');

let roundRobinCounter = 0;

const activeSessionsTotalGauge = new prom.Gauge({
  name: 'active_sessions_nodes_total',
  help: 'Number of active session in total on all engine nodes',
});
const remainingSessionsGauge = new prom.Gauge({
  name: 'remaining_sessions_nodes_total',
  help: 'Number of remaining sessions in total on all engine nodes that can be created before reaching threshold',
});

function compareResources(a, b) {
  // RAM free takes priority, but if equal then CPU is the deciding factor
  if (a.engine.health.mem.free > b.engine.health.mem.free) {
    return -1;
  }
  if (a.engine.health.mem.free < b.engine.health.mem.free) {
    return 1;
  }
  if (a.engine.health.cpu.total < b.engine.health.cpu.total) {
    return -1;
  }
  return 1;
}

// Returns true when NO kubernetes pod deletion timestamp is found
function isNotTerminating(instance) {
  return !(
    instance.kubernetes
    && instance.kubernetes.pod
    && instance.kubernetes.pod.metadata
    && !!instance.kubernetes.pod.metadata.deletionTimestamp
  );
}

class LoadBalancer {
  static giveMeAnEngine(engines) {
    // Only load balance on healthy engines
    const healthyEngines = engines.filter((instance) => instance.engine.status === 'OK').filter(isNotTerminating);
    // Remove engines with too many active sessions if a threshold was defined
    const filteredEngines = healthyEngines.length > 0 && Config.sessionsPerEngineThreshold
      ? this.checkMaxSessions(healthyEngines) : healthyEngines;

    switch (Config.sessionStrategy) {
      case 'weighted':
        return this.weightedLoad(filteredEngines);
      case 'roundrobin':
        return this.roundRobin(filteredEngines);
      default:
        return this.leastLoad(filteredEngines);
    }
  }

  static roundRobin(engines) {
    if (engines.length === 0) {
      return undefined;
    }

    if (roundRobinCounter >= engines.length) {
      roundRobinCounter = 0;
    }

    const engine = engines[roundRobinCounter];
    roundRobinCounter += 1;
    return engine;
  }

  static leastLoad(engines) {
    if (engines.length === 0) {
      return undefined;
    } if (engines.length === 1) {
      return engines[0];
    }
    const sortedEngines = engines.sort(compareResources);
    return sortedEngines[0];
  }

  static weightedLoad(engines) {
    const maxSessionsPerEngine = Config.sessionsPerEngineThreshold;

    // Calculate an array containing the maximum allowed session count
    // minus actual session count for each engine
    const sessionsPossibleToAllocateArray = engines.map((instance) => {
      if (!instance.engine.metrics) {
        return 0;
      }
      const sessionMetric = instance.engine.metrics.filter((metric) => metric.name === 'qix_active_sessions');
      const nbrSessions = parseInt(sessionMetric[0].metrics[0].value, 10);
      if (nbrSessions <= maxSessionsPerEngine) {
        return maxSessionsPerEngine - nbrSessions;
      }
      return 0;
    });
    const totalSessionsLeft = sessionsPossibleToAllocateArray
      .reduce((total, num) => total + num, 0);

    // magicNumber is a random number between 0 and totalSessionsLeft
    const magicNumber = (totalSessionsLeft * Math.random());

    // Loop over all engines and stop when aggregated sum of available
    // session spaces is above the magic number. The likelihood of an
    // engine being selected is proportional to the number of session spaces left
    let sessionSpaceSum = 0;
    for (let i = 0; i < engines.length; i += 1) {
      sessionSpaceSum += sessionsPossibleToAllocateArray[i];
      if (magicNumber <= sessionSpaceSum) {
        return engines[i];
      }
    }
    return undefined;
  }

  // Method for discarding engines that have more active sessions
  // than specified by env variable SESSIONS_PER_ENGINE_THRESHOLD.
  static checkMaxSessions(engines) {
    let totalSessions = 0;
    const filteredEngines = engines.filter((element) => {
      const sessionMetric = element.engine.metrics.filter((metric) => metric.name === 'qix_active_sessions');
      const nbrSessions = parseInt(sessionMetric[0].metrics[0].value, 10);
      totalSessions += nbrSessions;
      if (nbrSessions >= Config.sessionsPerEngineThreshold) {
        return false;
      }
      return true;
    });

    // Record total active sessions on all nodes
    activeSessionsTotalGauge.set(totalSessions);

    // Record number of remaining sessions before threshold is reached. Could be negative.
    if (Config.sessionsPerEngineThreshold) {
      const nbrTotalAllowedSessions = engines.length * Config.sessionsPerEngineThreshold;
      remainingSessionsGauge.set(nbrTotalAllowedSessions - totalSessions);
    }

    return filteredEngines;
  }
}

module.exports = LoadBalancer;
