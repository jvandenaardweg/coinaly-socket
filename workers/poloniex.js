// API Docs Poloniex: https://poloniex.com/support/api/

const Worker = require('./worker')
const ccxt = require('ccxt')
const autobahn = require('autobahn')
const PoloniexTransformer = require('../transformers/poloniex')

class Poloniex extends Worker {
  constructor () {
    super('Poloniex')
  }

  start () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }
}

module.exports = Poloniex
