const Worker = require('./worker')
const ccxt = require('ccxt')

class Bitfinex extends Worker {
  constructor () {
    super('Bitfinex')

    try {
      this.ccxt = new ccxt.bitfinex({
        enableRateLimit: true,
        timeout: 15000,
        verbose: false
      })
    } catch (e) {
      console.log(e)
    }
  }

  start () {
    // Bitfinex Rate Limiting: https://docs.bitfinex.com/v2/docs/getting-started
    this.startInterval('fetchTickers', 5000)
  }
}

module.exports = Bitfinex
