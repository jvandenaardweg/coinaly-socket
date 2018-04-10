const Worker = require('./worker')
const ccxt = require('ccxt')

class Kraken extends Worker {
  constructor () {
    super('Kraken')

    try {
      this.ccxt = new ccxt.kraken({
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

module.exports = Kraken
