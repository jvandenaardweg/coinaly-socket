const Worker = require('./worker')

class Okex extends Worker {
  constructor () {
    super('Okex')

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

module.exports = Okex
