const Worker = require('./worker')
const ccxt = require('ccxt')

class Bitfinex extends Worker {
  constructor () {
    super('Bitfinex')
  }

  start () {
    // Bitfinex Rate Limiting: https://docs.bitfinex.com/v2/docs/getting-started
    this.createCCXTInstance()
    this.startInterval('fetchTickers', 3000)
  }
}

module.exports = Bitfinex
