const process = require('process');
const containerized = require('containerized');

class Config {
  constructor() {
    Config.miraHostName = process.env.MIRA_HOST_NAME || (containerized() ? 'mira' : 'localhost');
    Config.miraPort = 9100;

    this.port = parseInt(process.env.PORT, 10);
    if (!this.port || isNaN(this.port)) {
      this.port = 9455;
    }
  }
}

module.exports = Config;
