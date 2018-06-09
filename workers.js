require('dotenv').config()

const Raven = require('raven')
Raven.config(process.env.SENTRY_DSN, {
  captureUnhandledRejections: true,
  autoBreadcrumbs: true
}).install()

const moment = require('moment')
const Table = require('cli-table')
const ccxt = require('ccxt')

const Worker = require('./workers/base')
// const binance = require('./workers/binance')
// const bittrex = require('./workers/bittrex')
// const poloniex = require('./workers/poloniex')

const Redis = require('ioredis')
const redisPub = new Redis(process.env.REDIS_URL)

const { convertObjectToKeyString } = require('./helpers/objects')


function saveAvailableExchanges (allExchanges, hasWebsocketTicker, exchangesToUsePolling) {
  const supportedExchanges = hasWebsocketTicker.concat(exchangesToUsePolling)
  const exchangesCache = allExchanges.reduce((previous, exchangeName) => {
    previous[exchangeName] = supportedExchanges.includes(exchangeName) // Returning example: bittrex: true
    return previous
  }, {})

  redisPub.hmset('exchanges', convertObjectToKeyString(exchangesCache))
}

// Wrap it in a Raven context, so unhandled exceptions are logged
Raven.context(function () {
  let workers = []

  // An array containing all available exchanges CCXT supports
  const allExchanges = ccxt.exchanges

  // An array with exchanges you want to have enabled
  // An empty array means this script will use all available exchanges
  const userEnabledExchanges = ['poloniex', 'binance', 'bittrex', 'kraken', 'okex', 'lbank', 'bithumb', 'bitfinex2', 'hitbtc2']

  // An array with exchanges that uses a websocket connection
  const hasWebsocketTicker = ['binance', 'bittrex', 'poloniex']

  // These exchange give errors while polling fetchTickers. So we disable them, for now.
  // Find out why this happens, maybe we need to tweak the interval time for these
  // const exchangesDisabled = ['bitfinex', 'hitbtc', 'btcexchange', 'bxinth', 'coolcoin', 'cointiger', 'xbtce', 'braziliex', 'btcbox', 'coinegg', 'coingi', 'dsx', 'ice3x', 'yobit', 'jubi', 'tidex', 'yunbi']
  const exchangesDisabled = []
  // We don't enable "bitfinex" or "hitbtc" because we want the script to use their V2 API's, which is exchange name "bitfinex2" and "hitbtc2"

  // Find out which exchanges we can poll
  const exchangesToUsePolling = allExchanges.filter(exchangeName => {
    if (hasWebsocketTicker.includes(exchangeName) || exchangesDisabled.includes(exchangeName) || !userEnabledExchanges.includes(exchangeName)) return

    // Check if the exchange supports "fetchTickers", which we use to poll the exchange at the rateLimit interval
    const ccxtInstance = new ccxt[exchangeName]
    if (ccxtInstance.has.fetchTickers) return true
  })

  // Find out which exchanges we can use for websocket
  // The exchangesDisabled array can overwrite the has hasWebsocketTicker
  const exchangesToUseWebsocket = allExchanges.filter(exchangeName => {
    return hasWebsocketTicker.includes(exchangeName) && userEnabledExchanges.includes(exchangeName) && !exchangesDisabled.includes(exchangeName)
  })

  // Save the available exchanges into Redis
  // So we can use that in other parts of our app
  saveAvailableExchanges(allExchanges, hasWebsocketTicker, exchangesToUsePolling)

  // Start polling
  exchangesToUsePolling.forEach(exchange => {
    workers[exchange] = new Worker(exchange)
    workers[exchange].createCCXTInstance()
    workers[exchange].startInterval('fetchTickers', 5000)
    // We use a 2 sec interval. The script will automatically look if this is within the API rate limitation
    // If the 2 sec interval is lower then the rateLimit, we use the rateLimit
  })

  // Start websockets
  exchangesToUseWebsocket.forEach(exchange => {
    const Worker = require(`./workers/${exchange}`)
    workers[exchange] = new Worker()
    workers[exchange].start()
  })

  setInterval(() => {
    // TODO: do health checking in here
    // Log status to console from each worker
    Object.keys(workers).forEach((exchangeSlug, index) => {
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
    `- Restarted at: ${workerInstance.lastRestartedAt}\n`,
    `- Last error at: ${workerInstance.lastErrorAt}\n`,
    `- Last reload market at: ${workerInstance.lastReloadMarketsAt}\n`
  )
}
