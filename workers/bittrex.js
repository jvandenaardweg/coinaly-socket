const Worker = require('./worker')
const ccxt = require('ccxt')

class Bittrex extends Worker {
  constructor () {
    super('Bittrex')

    try {
      this.ccxt = new ccxt.bittrex({
        enableRateLimit: true,
        timeout: 15000
      })
    } catch (e) {
      console.log(e)
    }
  }

  start () {
    this.startInterval('fetchTickers')
  }
}

module.exports = Bittrex
