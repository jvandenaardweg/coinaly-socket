const Worker = require('./worker')
const ccxt = require('ccxt')

class Bittrex extends Worker {
  constructor () {
    super('Bittrex')
  }

  async start () {
    await this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Bittrex
