const Worker = require('./worker')
const ccxt = require('ccxt')

class Hitbtc extends Worker {
  constructor () {
    super('Hitbtc')

    try {
      this.createCCXTInstance()
    } catch (e) {
      console.log(e)
    }

  start () {
    this.startInterval('fetchTickers')
  }
}

module.exports = Hitbtc
