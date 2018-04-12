const Worker = require('./worker')

class Bitz extends Worker {
  constructor () {
    super('Bitz')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Bitz
