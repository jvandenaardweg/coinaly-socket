require('newrelic')
require('dotenv').config()
const Raven = require('raven')
Raven.config(process.env.SENTRY_DSN, {
  captureUnhandledRejections: true,
  autoBreadcrumbs: true
}).install()
const moment = require('moment')
const Table = require('cli-table')
const exchangesEnabled = require('./exchanges-enabled')

// Wrap it in a Raven context, so unhandled exceptions are logged
Raven.context(function () {
  let workers = []

  const Binance = require('./workers/binance')
  const Bittrex = require('./workers/bittrex')
  // const BittrexWebsocket = require('./workers/bittrex-websocket')
  const Kraken = require('./workers/kraken')
  const Bitfinex = require('./workers/bitfinex')
  const Poloniex = require('./workers/poloniex')
  const Hitbtc = require('./workers/hitbtc')
  const Kucoin = require('./workers/kucoin')
  const Okex = require('./workers/okex')
  const Bithumb = require('./workers/bithumb')
  const Lbank = require('./workers/lbank')
  const Bitz = require('./workers/bitz')
  const Liqui = require('./workers/liqui')
  const Cryptocompare = require('./workers/cryptocompare')

  // Order reflects trading volumes on Coinmarketcap at 12 apr. 2018
  workers['binance'] = new Binance()
  workers['okex'] = new Okex()
  workers['bitfinex'] = new Bitfinex()
  workers['bithumb'] = new Bithumb()
  // workers['bittrex'] = new Bittrex()
  workers['bittrex'] = new Bittrex()
  workers['hitbtc'] = new Hitbtc()
  workers['lbank'] = new Lbank()
  workers['bitz'] = new Bitz()
  workers['kraken'] = new Kraken()
  workers['poloniex'] = new Poloniex()
  workers['kucoin'] = new Kucoin()
  workers['liqui'] = new Liqui()

  Object.keys(exchangesEnabled).forEach((exchangeSlug, index) => {
    workers[exchangeSlug].start()
  })

  // Report data to console for debugging and status check
  setInterval(() => {

    // Log status to console from each worker
    Object.keys(exchangesEnabled).forEach((exchangeSlug, index) => {
      logger(workers[exchangeSlug])

      // Per worker we can determine when we want a restart
      // Restart the worker if we should
      if (workers[exchangeSlug].shouldRestartNow()) {
        console.log(`\nSTATUS: ${workers[exchangeSlug].exchangeName} Worker: Restarting because of runningtime limitations...`)
        workers[exchangeSlug].restart()
      }
    })
  }, 5000)
})



function logger (workerInstance) {

  // instantiate
  // var table = new Table({
  //   head: ['Exchange', 'Updates', 'Running time', 'Time to restart', 'Last update', 'Started since', 'Restarted at', 'Last error at']
  // // , colWidths: [100, 200]
  // })

  // // table is an Array, so you can `push`, `unshift`, `splice` and friends 
  // table.push(
  //   [
  //     workerInstance.exchangeName,
  //     workerInstance.totalUpdates,
  //     `${workerInstance.runningTime('seconds')} seconds (${workerInstance.runningTime('hours')} hours)`,
  //     workerInstance.timeToRestart(),
  //     workerInstance.lastUpdateFromNow(),
  //     0,
  //     0,
  //     0
  //   ]
  // , ['First value', 'Second value', 'First value', 'Second value', 'First value', 'Second value', 'First value', 'Second value']
  // )

  // console.log(table.toString());

  console.log(
    `\nSTATUS: ${workerInstance.exchangeName} Worker:\n`,
    `- Total updates: ${workerInstance.totalUpdates}\n`,
    `- Running time: ${workerInstance.runningTime('seconds')} seconds (${workerInstance.runningTime('hours')} hours)\n`,
    `- Running time after reload: ${workerInstance.runningTimeAfterLastReload('seconds')} seconds\n`,
    `- Time to restart: ${workerInstance.timeToRestart()}\n`,
    `- Time to reload markets: ${workerInstance.timeToReloadMarkets()}\n`,
    `- Last update: ${workerInstance.lastUpdateFromNow()}\n`,
    `- Last reload markets: ${workerInstance.lastReloadMarketFromNow()}\n`,
    `- Started since: ${workerInstance.startedAt}\n`,
    `- Restarted at: ${workerInstance.restartedAt}\n`,
    `- Last error at: ${workerInstance.lastErrorAt}\n`,
    `- Last reload market at: ${workerInstance.lastReloadMarketsAt}\n`
  )
}
