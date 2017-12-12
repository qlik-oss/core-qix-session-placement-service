/* eslint import/no-unresolved:0, import/extensions:0, no-console:0 */

const WebSocket = require('ws');
const enigma = require('enigma.js');
const qixSchema = require('../node_modules/enigma.js/schemas/qix/3.1/schema.json');
const uuid = require('uuid/v4');
const logger = require('./Logger').get();

// number of seconds QIX Engine should keep the session alive after disconnecting
// the last socket to a session:
const DEFAULT_TTL = 5;

function createConfiguration(host, port, sessionId, jwt) {
  const config = {
    schema: qixSchema,
    session: {
      disableCache: true,
      secure: false,
      route: 'app/engineData',
      ttl: DEFAULT_TTL,
      host,
      port,
    },
    createSocket(url) {
      return new WebSocket(url, {
        headers: {
          'X-Qlik-Session': sessionId,
          Authorization: jwt,
        },
      });
    },
    handleLog: logRow => logger.info(JSON.stringify(logRow)),
  };
  return config;
}

class DocPrepper {
  static async prepareDoc(host, port, docId, jwt) {
    const sessionId = uuid();
    const config = createConfiguration(host, port, sessionId, jwt);
    try {
      const qix = await enigma.getService('qix', config);
      const doc = docId ? await qix.global.openDoc(docId) : await qix.global.createSessionApp();
      if (docId) {
        // openDoc creates a new socket for the document that we need to close
        // explicitly:
        doc.session.close();
      }
      qix.global.session.close();
      return sessionId;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}

module.exports = DocPrepper;
