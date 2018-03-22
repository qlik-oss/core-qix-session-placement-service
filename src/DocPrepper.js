const WebSocket = require('ws');
const enigma = require('enigma.js');
const uuid = require('uuid/v4');
const logger = require('./Logger').get();
const createError = require('http-errors');

// number of seconds Qlik Associative Engine should keep the session alive after disconnecting
// the last socket to a session:
const DEFAULT_TTL = 60;

function createConfiguration(host, port, sessionId, jwt) {
  const headers = {
    'X-Qlik-Session': sessionId,
  };
  if (jwt) {
    headers.Authorization = jwt;
  }
  const config = {
    schema: {
      structs: {
        Global: {
          OpenDoc: {
            In: [
              { Name: 'qDocName', DefaultValue: '' },
              { Name: 'qUserName', DefaultValue: '', Optional: true },
              { Name: 'qPassword', DefaultValue: '', Optional: true },
              { Name: 'qSerial', DefaultValue: '', Optional: true },
              { Name: 'qNoData', DefaultValue: false, Optional: true },
            ],
            Out: [],
          },
          CreateSessionApp: {
            In: [],
            Out: [{ Name: 'qSessionAppId' }],
          },
        },
        Doc: {},
      },
    },
    url: `ws://${host}:${port}/app/engineData/ttl/${DEFAULT_TTL}`,
    createSocket(url) {
      return new WebSocket(url, {
        headers,
      });
    },
  };
  return config;
}

class DocPrepper {
  static async prepareDoc(host, port, docId, jwt) {
    const sessionId = uuid();
    const config = createConfiguration(host, port, sessionId, jwt);
    try {
      const session = enigma.create(config);

      if (process.env.LOG_LEVEL === 'debug') {
        session.on('traffic:*', (direction, msg) => logger.debug(`${direction}: ${JSON.stringify(msg)}`));
      }

      const qix = await session.open();

      if (docId) {
        await qix.openDoc(docId);
      } else {
        await qix.createSessionApp();
      }

      await qix.session.close();

      return sessionId;
    } catch (err) {
      logger.error(`Failed to open doc with error: ${err}`);
      throw createError(`Failed to open doc with error: ${err}`);
    }
  }
}

module.exports = DocPrepper;
