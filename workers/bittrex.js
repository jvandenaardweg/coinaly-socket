const Worker = require('./worker')
const ccxt = require('ccxt')

class Bittrex extends Worker {
  constructor () {
    super('Bittrex')

    try {
      this.createCCXTInstance()
    } catch (e) {
      console.log(e)
    }
  }

  start () {
    this.startInterval('fetchTickers')
  }
}

module.exports = Bittrex
