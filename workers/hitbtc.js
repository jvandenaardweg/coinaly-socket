const Worker = require('./worker')
const ccxt = require('ccxt')

class Hitbtc extends Worker {
  constructor () {
    super('Hitbtc')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Hitbtc
