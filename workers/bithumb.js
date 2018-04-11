const Worker = require('./worker')

class Bithumb extends Worker {
  constructor () {
    super('Bithumb')

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

module.exports = Bithumb
