const Worker = require('./worker')
const ccxt = require('ccxt')

class Poloniex extends Worker {
  constructor () {
    super('Poloniex')

    try {
      this.createCCXTInstance()
    } catch (e) {
      console.log(e)
    }

  start () {
    this.startInterval('fetchTickers')
  }
}

module.exports = Poloniex
