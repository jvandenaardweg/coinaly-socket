const Worker = require('./worker')
const ccxt = require('ccxt')

class Poloniex extends Worker {
  constructor () {
    super('Poloniex')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Poloniex
