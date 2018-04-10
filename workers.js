require('newrelic')
require('dotenv').config();
var Raven = require('raven');
Raven.config('https://386d9fe693df4a56b26b1a549d0372a0:f6d8e784e378493e8cf1556660b1cad6@sentry.io/711243', {
  captureUnhandledRejections: true,
  autoBreadcrumbs: true
}).install();

Raven.context(function () {
  const Binance = require('./workers/binance')
  const Bittrex = require('./workers/bittrex')
  const Gdax = require('./workers/gdax')
  const Gemini = require('./workers/gemini')
  const Kraken = require('./workers/kraken')
  const Bitfinex = require('./workers/bitfinex')
  const moment = require('moment')

  const binanceWorker = new Binance()
  binanceWorker.start()

  const bittrexWorker = new Bittrex()
  bittrexWorker.start()

  // const gdaxWorker = new Gdax()
  // gdaxWorker.start()

  // const geminiWorker = new Gemini()
  // geminiWorker.start()

  const krakenWorker = new Kraken()
  krakenWorker.start()

  const bitfinexWorker = new Bitfinex()
  bitfinexWorker.start()

  // Report data to console for debugging and status check
  setInterval(() => {
    if (binanceWorker.startedAt) {
      if (binanceWorker.shouldRestartNow()) {
        console.log(`\nSTATUS: Binance Worker: Restarting because of runningtime limitations...`)
        binanceWorker.restart()
      }
      console.log(
        '\nSTATUS: Binance Worker:\n',
        `- Total updates: ${binanceWorker.totalUpdates}\n`,
        `- Running time: ${binanceWorker.runningTime('seconds')} seconds (${binanceWorker.runningTime('hours')} hours)\n`,
        `- Time to restart: ${binanceWorker.timeToRestart()}\n`,
        `- Last update: ${binanceWorker.lastUpdateFromNow()}\n`,
        `- Started since: ${binanceWorker.startedAt}\n`,
        `- Restarted at: ${binanceWorker.restartedAt}\n`,
        `- Last error at: ${binanceWorker.lastErrorAt}\n`
      )
    }

    if (bittrexWorker.startedAt) {
      console.log(
        '\nSTATUS: Bittrex Worker:\n',
        `- Total updates: ${bittrexWorker.totalUpdates}\n`,
        `- Running time: ${bittrexWorker.runningTime('seconds')} seconds (${bittrexWorker.runningTime('hours')} hours)\n`,
        `- Time to restart: 0\n`,
        `- Last update: ${bittrexWorker.lastUpdateFromNow()}\n`,
        `- Started since: ${bittrexWorker.startedAt}\n`,
        `- Restarted at: ${bittrexWorker.restartedAt}\n`,
        `- Last error at: ${bittrexWorker.lastErrorAt}\n`
      )
    }

    if (krakenWorker.startedAt) {
      console.log(
        '\nSTATUS: Kraken Worker:\n',
        `- Total updates: ${krakenWorker.totalUpdates}\n`,
        `- Running time: ${krakenWorker.runningTime('seconds')} seconds (${krakenWorker.runningTime('hours')} hours)\n`,
        `- Time to restart: 0\n`,
        `- Last update: ${krakenWorker.lastUpdateFromNow()}\n`,
        `- Started since: ${krakenWorker.startedAt}\n`,
        `- Restarted at: ${krakenWorker.restartedAt}\n`,
        `- Last error at: ${krakenWorker.lastErrorAt}\n`
      )
    }

    if (bitfinexWorker.startedAt) {
      console.log(
        '\nSTATUS: Bitfinex Worker:\n',
        `- Total updates: ${bitfinexWorker.totalUpdates}\n`,
        `- Running time: ${bitfinexWorker.runningTime('seconds')} seconds (${bitfinexWorker.runningTime('hours')} hours)\n`,
        `- Time to restart: 0\n`,
        `- Last update: ${bitfinexWorker.lastUpdateFromNow()}\n`,
        `- Started since: ${bitfinexWorker.startedAt}\n`,
        `- Restarted at: ${bitfinexWorker.restartedAt}\n`,
        `- Last error at: ${bitfinexWorker.lastErrorAt}\n`
      )
    }
  }, 5000)
})
