const prom = require('prom-client');
const Config = require('./Config');
const logger = require('./Logger').get();

// Collect default prometheus metrics every 10 seconds
const collectDefaultMetrics = prom.collectDefaultMetrics;
collectDefaultMetrics();

// Create metric histogram and summary for api response times
const responseTimeHistogram = new prom.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Time in seconds consumed from qix-session-service receiving a request until a response is sent per path and status',
  labelNames: ['path', 'status_code'],
});

const responseTimeSummary = new prom.Summary({
  name: 'http_request_duration_seconds_total',
  help: 'Time in seconds consumed from qix-session-service receiving a request until a response is sent in total',
});

// function for recording time consumed for a request and adding as metric
function recordResponseTimes() {
  return async function responseTime(ctx, next) {
    const requestTime = Date.now();
    await next();
    const diff = Math.ceil((Date.now() - requestTime) / 1000);
    responseTimeSummary.observe(diff);
    responseTimeHistogram.observe({ path: ctx.request.url, status_code: ctx.status }, diff);
    if (diff > Config.allowedResponseTime) {
      logger.warn(`Request for endpoint ${ctx.request.url} took ${diff} s, which is longer than allowed ${Config.allowedResponseTime} s`);
    }
  };
}

module.exports = recordResponseTimes;
