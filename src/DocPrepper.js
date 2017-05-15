/* eslint import/no-unresolved:0, import/extensions:0, no-console:0 */

const WebSocket = require('ws');
const enigma = require('enigma.js');
const qixSchema = require('../node_modules/enigma.js/schemas/qix/3.1/schema.json');
const uuid = require('uuid/v4');
const logger = require('./Logger').get();

function createConfiguration(host, port, sessionId) {
  const config = {
    schema: qixSchema,
    session: {
      secure: false,
      unsecure: true,
      route: 'app/engineData',
      host,
      port
    },
    createSocket(url) {
      return new WebSocket(url, {
        headers: {
          'X-Qlik-Session': sessionId
        }
      });
    },
    handleLog: logRow => logger.info(logRow)
  };
  return config;
}

class DocPrepper {
  static async prepareDoc(host, port, docId) {
    const sessionId = uuid();
    const config = createConfiguration(host, port, sessionId);
    try {
      const qix = await enigma.getService('qix', config);
      const doc = docId ? await qix.global.openDoc(docId) : await qix.global.createSessionApp();
      setTimeout(() => {
        if (docId) {
          doc.session.close();
        } else {
          qix.global.session.close();
        }
      }, 1000);
      return sessionId;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}

module.exports = DocPrepper;
