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
}

module.exports = LoadBalancer;
