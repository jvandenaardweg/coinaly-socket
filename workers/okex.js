const Worker = require('./worker')

class Okex extends Worker {
  constructor () {
    super('Okex')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Okex
