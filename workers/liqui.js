const Worker = require('./worker')

class Liqui extends Worker {
  constructor () {
    super('Liqui')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Liqui
