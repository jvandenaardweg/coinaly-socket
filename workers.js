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
  const Poloniex = require('./workers/poloniex')
  const Hitbtc = require('./workers/hitbtc')
  const Kucoin = require('./workers/kucoin')
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

  const poloniexWorker = new Poloniex()
  poloniexWorker.start()

  const hitbtcWorker = new Hitbtc()
  hitbtcWorker.start()

  const kucoinWorker = new Kucoin()
  kucoinWorker.start()

  // Report data to console for debugging and status check
  setInterval(() => {
    if (binanceWorker.startedAt) {
      if (binanceWorker.shouldRestartNow()) {
        console.log(`\nSTATUS: Binance Worker: Restarting because of runningtime limitations...`)
        binanceWorker.restart()
      }
      logger(binanceWorker)
    }

    if (bittrexWorker.startedAt) {
      logger(bittrexWorker)
    }

    if (krakenWorker.startedAt) {
      logger(krakenWorker)
    }

    if (bitfinexWorker.startedAt) {
      logger(bitfinexWorker)
    }

    if (poloniexWorker.startedAt) {
      logger(poloniexWorker)
    }

    if (hitbtcWorker.startedAt) {
      logger(hitbtcWorker)
    }

    if (kucoinWorker.startedAt) {
      logger(kucoinWorker)
    }
  }, 5000)
})


function logger (workerInstance) {
  console.log(
    `\nSTATUS: ${workerInstance.exchangeName} Worker:\n`,
    `- Total updates: ${workerInstance.totalUpdates}\n`,
    `- Running time: ${workerInstance.runningTime('seconds')} seconds (${workerInstance.runningTime('hours')} hours)\n`,
    `- Time to restart: 0\n`,
    `- Last update: ${workerInstance.lastUpdateFromNow()}\n`,
    `- Started since: ${workerInstance.startedAt}\n`,
    `- Restarted at: ${workerInstance.restartedAt}\n`,
    `- Last error at: ${workerInstance.lastErrorAt}\n`
  )
}
