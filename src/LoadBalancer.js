const Config = require('./Config');

let roundRobinCounter = 0;

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

class LoadBalancer {
  static giveMeAnEngine(engines) {
    // Only load balance on healthy engines
    const healthyEngines = engines.filter(instance => instance.engine.status === 'OK');
    // Remove engines with too many active sessions if a threshold was defined
    const filteredEngines = healthyEngines.length > 0 && Config.sessionsPerEngineThreshold ?
      this.checkMaxSessions(healthyEngines) : healthyEngines;

    switch (Config.sessionStrategy) {
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
    } else if (engines.length === 1) {
      return engines[0];
    }
    const sortedEngines = engines.sort(compareResources);
    return sortedEngines[0];
  }

  // Method for discarding engines that have more active sessions
  // than specified by env variable SESSIONS_PER_ENGINE_THRESHOLD.
  static checkMaxSessions(engines) {
    return engines.filter((element) => {
      const sessionMetric = element.engine.metrics.filter(metric => metric.name === 'qix_active_sessions');

      if (sessionMetric[0].metric[0].gauge.value >= Config.sessionsPerEngineThreshold) {
        return false;
      }
      return true;
    });
  }
}

module.exports = LoadBalancer;
