const Worker = require('./worker')

class Lbank extends Worker {
  constructor () {
    super('Lbank')

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

module.exports = Lbank
