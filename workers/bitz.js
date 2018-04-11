const Worker = require('./worker')

class Bitz extends Worker {
  constructor () {
    super('Bitz')

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

module.exports = Bitz
