let roundRobinCounter = 0;

class LoadBalancer {
  static roundRobin(engines) {
    const healthyEngines = engines.filter(engine => engine.properties.healthy);

    if (healthyEngines.length === 0) {
      return undefined;
    }

    if (roundRobinCounter >= healthyEngines.length) {
      roundRobinCounter = 0;
    }

    const engine = healthyEngines[roundRobinCounter];
    roundRobinCounter += 1;
    return engine;
  }
}

module.exports = LoadBalancer;
