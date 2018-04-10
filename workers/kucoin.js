const Worker = require('./worker')
const ccxt = require('ccxt')

class Kucoin extends Worker {
  constructor () {
    super('Kucoin')

    try {
      this.ccxt = new ccxt.kucoin({
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

module.exports = Kucoin
