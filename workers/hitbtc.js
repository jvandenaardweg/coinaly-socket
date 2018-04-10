const Worker = require('./worker')
const ccxt = require('ccxt')

class Hitbtc extends Worker {
  constructor () {
    super('Hitbtc')

    try {
      this.ccxt = new ccxt.hitbtc({
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

module.exports = Hitbtc
