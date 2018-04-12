const Worker = require('./worker')

class Lbank extends Worker {
  constructor () {
    super('Lbank')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Lbank
