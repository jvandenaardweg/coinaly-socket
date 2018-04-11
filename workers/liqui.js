const Worker = require('./worker')

class Liqui extends Worker {
  constructor () {
    super('Liqui')

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

module.exports = Liqui
