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
    this.startInterval('fetchTickers')
  }
}

module.exports = Bitfinex
