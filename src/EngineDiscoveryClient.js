const http = require('http');
const logger = require('./Logger').get();

const Config = require('./Config');

class EngineDiscoveryClient {
  static listEngines() {
    return new Promise((resolve /* , reject*/) => {
      http.get({
        host: Config.miraHostName,
        port: Config.miraPort,
        path: '/v1/engines',
      }, (response) => {
        let body = '';
        response.on('data', (d) => {
          body += d;
        });
        response.on('error', (d) => {
          logger.error(d);
          resolve(d);
        });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (parseErr) {
            logger.error(parseErr);
            resolve(parseErr);
          }
        });
      });
    });
  }
}

module.exports = EngineDiscoveryClient;
