/* eslint import/no-unresolved:0, import/extensions:0, no-console:0 */

const WebSocket = require('ws');
const enigma = require('enigma.js');
const schema = require('../node_modules/enigma.js/schemas/12.20.0.json');
const uuid = require('uuid/v4');
const logger = require('./Logger').get();

// number of seconds QIX Engine should keep the session alive after disconnecting
// the last socket to a session:
const DEFAULT_TTL = 5;

function createConfiguration(host, port, sessionId, jwt) {
  const config = {
    schema,
    url: `ws://${host}:${port}/app/engineData/ttl/${DEFAULT_TTL}`,
    // session: {
    //   disableCache: true,
    //   secure: false,
    //   route: 'app/engineData',
    //   ttl: DEFAULT_TTL,
    //   host,
    //   port
    // },
    createSocket(url) {
      return new WebSocket(url, {
        headers: {
          'X-Qlik-Session': sessionId,
          Authorization: jwt
        }
      });
    },
    // handleLog: logRow => logger.info(JSON.stringify(logRow))
  };
  return config;
}

class DocPrepper {
  static async prepareDoc(host, port, docId, jwt) {
    const sessionId = uuid();
    const config = createConfiguration(host, port, sessionId, jwt);
    try {
      const session = enigma.create(config);
      session.on('traffic:*', logRow => logger.info(JSON.stringify(logRow)));

      const qix = await session.open();

      docId ? await qix.openDoc(docId) : await qix.createSessionApp();


      logger.info(`session closed`);

      await qix.session.close();

      return sessionId;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}

module.exports = DocPrepper;
