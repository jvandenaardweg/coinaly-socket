const Worker = require('./worker')
const ccxt = require('ccxt')

class Kraken extends Worker {
  constructor () {
    super('Kraken')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Kraken
