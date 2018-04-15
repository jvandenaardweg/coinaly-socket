const Worker = require('./worker')
const ccxt = require('ccxt')

class Bittrex extends Worker {
  constructor () {
    super('Bittrex')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Bittrex
