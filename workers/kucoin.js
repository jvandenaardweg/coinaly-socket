const Worker = require('./worker')
const ccxt = require('ccxt')

class Kucoin extends Worker {
  constructor () {
    super('Kucoin')

    try {
      this.createCCXTInstance()
    } catch (e) {
      console.log(e)
    }

  start () {
    this.startInterval('fetchTickers')
  }
}

module.exports = Kucoin
