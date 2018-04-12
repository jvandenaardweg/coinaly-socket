const Worker = require('./worker')
const ccxt = require('ccxt')

class Kraken extends Worker {
  constructor () {
    super('Kraken')

    try {
      this.createCCXTInstance()
    } catch (e) {
      console.log(e)
    }

  start () {
    this.startInterval('fetchTickers')
  }
}

module.exports = Kraken
