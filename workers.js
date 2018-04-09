require('newrelic')
require('dotenv').config();
var Raven = require('raven');
Raven.config('https://386d9fe693df4a56b26b1a549d0372a0:f6d8e784e378493e8cf1556660b1cad6@sentry.io/711243').install();
const Binance = require('./workers/binance')
const Bittrex = require('./workers/bittrex')
const moment = require('moment')

const binanceWorker = new Binance()
binanceWorker.start()

const bittrexWorker = new Bittrex()
bittrexWorker.start()

setInterval(() => {
  if (binanceWorker.startedSince) {
    console.log('Binance Worker', 'Running time', moment(binanceWorker.startedSince).fromNow())
  }

  if (bittrexWorker.startedSince) {
    console.log('Bittrex Worker', 'Running time', moment(binanceWorker.startedSince).fromNow())
  }
}, 5000)
