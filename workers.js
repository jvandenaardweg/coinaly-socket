require('newrelic')
require('dotenv').config()
const Raven = require('raven')
Raven.config(process.env.SENTRY_DSN, {
  captureUnhandledRejections: true,
  autoBreadcrumbs: true
}).install()
const moment = require('moment')
const Table = require('cli-table')
const ccxt = require('ccxt')
const Worker = require('./workers/worker')
const Binance = require('./workers/binance')
const Redis = require('ioredis')
const redisPub = new Redis(process.env.REDIS_URL)
const { convertObjectToKeyString } = require('./helpers/objects')

// Wrap it in a Raven context, so unhandled exceptions are logged
Raven.context(function () {
  let workers = []

  // An array containing all available exchanges CCXT supports
  const allExchanges = ccxt.exchanges

  // An array with exchanges you want to have enabled
  // An empty array means this script will use all available exchanges
  const userEnabledExchanges = ['bittrex', 'poloniex', 'okex', 'kraken', 'hitbtc', 'lbank', 'bithumb']

  // An array with exchanges that uses a websocket connection
  const hasWebsocketTicker = ['binance']
  // const hasWebsocketTicker = ['binance', 'bitfinex', 'bitfinex2', 'bitflyer', 'bitmex', 'bitstamp', 'gdax', 'hitbtc', 'hitbtc2', 'huobi', 'okex']
  // TODO: add bittrex, poloniex when done testing. We just poll bittrex and poloniex for now

  // These exchange give errors while polling fetchTickers. So we disable them, for now.
  // Find out why this happens, maybe we need to tweak the interval time for these
  const exchangesDisabled = ['bitfinex', 'hitbtc', 'btcexchange', 'bxinth', 'coolcoin', 'cointiger', 'xbtce', 'braziliex', 'btcbox', 'coinegg', 'coingi', 'dsx', 'ice3x', 'yobit', 'jubi', 'tidex', 'yunbi']
  // We don't enable "bitfinex" or "hitbtc" because we want the script to use their V2 API's, which is exchange name "bitfinex2" and "hitbtc2"

  // Find out which exchanges we can poll
  const exchangesToPoll = allExchanges.filter(exchangeName => {
    if (
      hasWebsocketTicker.includes(exchangeName) ||
      exchangesDisabled.includes(exchangeName) ||
      !userEnabledExchanges.includes(exchangeName)
    ) return

    // Check if the exchange supports "fetchTickers", which we use to poll the exchange at the rateLimit interval
    const ccxtInstance = new ccxt[exchangeName]
    if (ccxtInstance.has.fetchTickers) return true
  })

  // Start polling
  exchangesToPoll.map(exchange => {
    const exchangeWorker = new Worker(exchange)
    exchangeWorker.createCCXTInstance()
    exchangeWorker.startInterval('fetchTickers', 2000)

    // Log the status of each worker to the console every X seconds
    // setInterval(() => {

    //   // Log status to console from each worker
    //   logger(exchangeWorker)

    //   // Per worker we can determine when we want a restart
    //   // Restart the worker if we should
    //   if (exchangeWorker.shouldRestartNow()) {
    //     console.log(`\nSTATUS: ${exchange} Worker: Restarting because of runningtime limitations...`)
    //     exchangeWorker.restart()
    //   }
    // }, 5000)

  })

  const supportedExchanges = hasWebsocketTicker.concat(exchangesToPoll)

  const exchangesCache = allExchanges.reduce((previous, exchangeName) => {
    previous[exchangeName] = supportedExchanges.includes(exchangeName) // Returning example: bittrex: true
    return previous
  }, {})

  redisPub.hmset('exchanges', convertObjectToKeyString(exchangesCache))

  const websocketExchangeWorker = new Binance()
  websocketExchangeWorker.start()

  // setInterval(() => {

  //   // Log status to console from each worker
  //   // Object.keys(exchangesEnabled).forEach((exchangeSlug, index) => {
  //     // logger(workers[exchangeSlug])

  //     // Per worker we can determine when we want a restart
  //     // Restart the worker if we should
  //     if (websocketExchangeWorker.shouldRestartNow()) {
  //       console.log(`\nSTATUS: ${workers[exchangeSlug].exchangeName} Worker: Restarting because of runningtime limitations...`)
  //       workers[exchangeSlug].restart()
  //     }
  //   // })
  // }, 5000)

  // console.log(`${exchangesToPoll.length} exchanges that have polling fallback methods to fetch ticker data`, exchangesToPoll)

  // const Binance = require('./workers/binance')

  // Order reflects trading volumes on Coinmarketcap at 12 apr. 2018
  // workers['binance'] = new Binance()
  // workers['okex'] = new Okex()
  // workers['bitfinex'] = new Bitfinex()
  // workers['bithumb'] = new Bithumb()
  // workers['bittrex'] = new Bittrex()
  // workers['bittrex'] = new Bittrex()
  // workers['hitbtc'] = new Hitbtc()
  // workers['lbank'] = new Lbank()
  // workers['bitz'] = new Bitz()
  // workers['kraken'] = new Kraken()
  // workers['poloniex'] = new Poloniex()
  // workers['kucoin'] = new Kucoin()
  // workers['liqui'] = new Liqui()

  // Object.keys(exchangesEnabled).forEach((exchangeSlug, index) => {
  //   workers[exchangeSlug].start()
  // })

  // Report data to console for debugging and status check
  // setInterval(() => {

  //   // Log status to console from each worker
  //   Object.keys(exchangesEnabled).forEach((exchangeSlug, index) => {
  //     // logger(workers[exchangeSlug])

  //     // Per worker we can determine when we want a restart
  //     // Restart the worker if we should
  //     if (workers[exchangeSlug].shouldRestartNow()) {
  //       console.log(`\nSTATUS: ${workers[exchangeSlug].exchangeName} Worker: Restarting because of runningtime limitations...`)
  //       workers[exchangeSlug].restart()
  //     }
  //   })
  // }, 5000)
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
    `- Restarted at: ${workerInstance.lastRestartedAt}\n`,
    `- Last error at: ${workerInstance.lastErrorAt}\n`,
    `- Last reload market at: ${workerInstance.lastReloadMarketsAt}\n`
  )
}
