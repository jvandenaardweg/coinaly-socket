const Worker = require('./worker')
const ccxt = require('ccxt')

class Poloniex extends Worker {
  constructor () {
    super('Poloniex')

    try {
      this.ccxt = new ccxt.poloniex({
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

module.exports = Poloniex
