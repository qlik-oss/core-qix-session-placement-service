let roundRobinCounter = 0;

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
}

module.exports = LoadBalancer;
