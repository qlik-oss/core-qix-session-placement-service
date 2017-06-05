const process = require('process');
const Koa = require('koa');
const Router = require('koa-router');
const koaLoggerWinston = require('koa-logger-winston');
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
const router = new Router({ prefix: `/${apiVersion}` });
const config = new Config();
const document = swagger.loadDocumentSync(path.join(__dirname, './../doc/api-doc.yml'));

function onUnhandledError(err) {
  logger.error('Process encountered an unhandled error', err);
  process.exit(1);
}

/*
 * Service bootstrapping
 */

process.on('SIGTERM', () => {
  app.close(() => {
    logger.info('Process exiting on SIGTERM');
    process.exit(0);
  });
});

process.on('uncaughtException', onUnhandledError);
process.on('unhandledRejection', onUnhandledError);

router.get(`/${healthEndpoint}`, async (ctx) => { ctx.body = 'OK'; });

router.get(`/${sessionEndpoint}/doc/:docId`, async (ctx) => {
  const fullDocId = `/doc/${ctx.params.docId}`;
  const sessionInfo = await qixSessionService.openSession(fullDocId);
  ctx.body = JSON.stringify(sessionInfo, undefined, '   ');
});

router.get(`/${sessionEndpoint}/session-doc`, async (ctx) => {
  const sessionInfo = await qixSessionService.openSession('');
  ctx.body = JSON.stringify(sessionInfo, undefined, '   ');
});

app
  .use(swagger2koa.ui(document, '/openapi'))
  .use(koaLoggerWinston(logger))
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(config.port);

    logger.info('Process exiting on SIGTERM');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Process encountered an uncaught exception', err);
  process.exit(1);
logger.info(`Listening on port ${config.port}`);
