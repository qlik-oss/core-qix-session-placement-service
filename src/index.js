const Koa = require('koa');
const Router = require('koa-router');
const swagger = require('swagger2');
const swagger2koa = require('swagger2-koa');
const path = require('path');
const Config = require('./Config');
const qixSessionService = require('./QixSessionService');
const logger = require('./Logger').get();
const prom = require('prom-client');
const metrics = require('./Metrics');

Config.init();

const apiVersion = 'v1';
const healthEndpoint = 'health';
const sessionEndpoint = 'session';
const metricsEndpoint = 'metrics';

const app = new Koa();
const router = new Router({
  prefix: `/${apiVersion}`,
});

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
    logger.error(`Failed to open doc id ${ctx.params.docId} with error message: ${err}`);
    ctx.status = err.status || 500;
  }
});

router.get(`/${sessionEndpoint}/session-doc`, async (ctx) => {
  try {
    const sessionInfo = await qixSessionService.openSession('', ctx.headers.authorization);
    ctx.body = JSON.stringify(sessionInfo, undefined, '   ');
  } catch (err) {
    logger.error(`Failed to create a session doc with error message: ${err}`);
    ctx.status = err.status || 500;
  }
});

router.get(`/${metricsEndpoint}`, async (ctx) => {
  if (ctx.accepts('text')) {
    ctx.body = prom.register.metrics();
  } else {
    ctx.body = prom.register.getMetricsAsJSON();
  }
});

app
  .use(metrics())
  .use(swagger2koa.ui(document, '/openapi'))
  .use(router.routes())
  .use(router.allowedMethods());

server = app.listen(Config.port);

logger.info(`Listening on port ${Config.port}`);
