const Koa = require('koa');
const Router = require('koa-router');
const swagger = require('swagger2');
const swagger2koa = require('swagger2-koa');
const path = require('path');
const Config = require('./Config');
const qixSessionService = require('./QixSessionService');
const logger = require('./Logger').get();

const apiVersion = 'v1';
const healthEndpoint = 'health';
const sessionEndpoint = 'session';

const app = new Koa();
const router = new Router({
  prefix: `/${apiVersion}`,
});
const config = new Config();
const document = swagger.loadDocumentSync(path.join(__dirname, './../doc/api-doc.yml'));
let server;

function onUnhandledError(err) {
  logger.error('Process encountered an unhandled error', err);
  process.exit(1);
}

process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Process exiting on SIGTERM');
    process.exit(0);
  });
});

process.on('uncaughtException', onUnhandledError);
process.on('unhandledRejection', onUnhandledError);

router.get(`/${healthEndpoint}`, async (ctx) => {
  ctx.body = 'OK';
});

router.get(`/${sessionEndpoint}/doc/:docId`, async (ctx) => {
  const fullDocId = `/doc/${ctx.params.docId}`;
  try {
    const sessionInfo = await qixSessionService.openSession(fullDocId, ctx.headers.authorization);
    ctx.body = JSON.stringify(sessionInfo, undefined, '   ');
  } catch (err) {
    ctx.throw(err.status || 500, err.message);
  }
});

router.get(`/${sessionEndpoint}/session-doc`, async (ctx) => {
  try {
    const sessionInfo = await qixSessionService.openSession('', ctx.headers.authorization);
    ctx.body = JSON.stringify(sessionInfo, undefined, '   ');
  } catch (err) {
    ctx.throw(err.status || 500, err.message);
  }
});

app
  .use(swagger2koa.ui(document, '/openapi'))
  .use(router.routes())
  .use(router.allowedMethods());

server = app.listen(config.port);

logger.info(`Listening on port ${config.port}`);
