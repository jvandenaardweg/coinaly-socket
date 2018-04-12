const Worker = require('./worker')

class Bithumb extends Worker {
  constructor () {
    super('Bithumb')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Bithumb
