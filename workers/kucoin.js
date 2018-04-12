const Worker = require('./worker')
const ccxt = require('ccxt')

class Kucoin extends Worker {
  constructor () {
    super('Kucoin')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Kucoin
