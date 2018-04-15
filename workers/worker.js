"use strict";
require('dotenv').config()
var Raven = require('raven')
Raven.config(process.env.SENTRY_DSN).install()
const redis = require('../redis')
const Redis = require('ioredis')
const redisPub = new Redis(process.env.REDIS_URL)
const moment = require('moment')
const interval = require('interval-promise')
const ccxt = require('ccxt')

class Worker {
  constructor (name) {
    this.exchangeName = name || 'Unknown'
    this.exchangeSlug = this.exchangeName.toLowerCase()
    this.exchangeCapitalized = this.exchangeName.toUpperCase()
    this.redisPub = redisPub
    this.startedAt = new Date()
    this.totalErrors = 0
    this.totalReloadsMarkets = 0
    this.totalUpdates = 0
    this.restartNow = false
    this.restartAfterHours = null
    this.lastRestartedAt = null
    this.lastUpdateAt = null
    this.lastErrorAt = null
    this.lastCheckedAt = null
    this.lastResetAt = null
    this.reloadMarketsAfterMinutes = 60 // Reload the markets data every hour
    this.lastReloadMarketsAt = null
    this.cacheKey = {
     'tickers': `exchanges:${this.exchangeSlug}:tickers`,
     'markets': `exchanges:${this.exchangeSlug}:markets`,
     'status': `workers:${this.exchangeSlug}:status`
    }
    // redis.hset(this.cacheKey['status'], 'startedAt', this.startedAt)
  }

  // Returns the running time of the worker in the given unitOfTime
  // Example: this.runningTime('seconds') returns running time in seconds
  runningTime (unitOfTime) {
    let timeToUse = this.startedAt
    if (this.lastRestartedAt) timeToUse = this.lastRestartedAt
    if (timeToUse) return moment().diff(timeToUse, unitOfTime) // seconds, hours, minutes etc...
    return 0
  }

  // Returns the running time after we have last reloaded the markets data
  // We reload the markets data because markets can be removed from an exchange
  // This way the worker always has the latest markets
  runningTimeAfterLastReload (unitOfTime) {
    let timeToUse
    if (this.lastReloadMarketsAt) timeToUse = this.lastReloadMarketsAt
    if (timeToUse) return moment().diff(timeToUse, unitOfTime) // seconds, hours, minutes etc...
    return 0
  }

  // Returns the time in (xx seconds/minutes/hours ago) when the last update occurred
  // An "update" is when we received data from the exchange API
  lastUpdateFromNow () {
    if (!this.lastUpdateAt) return 0
    return moment(this.lastUpdateAt).fromNow()
  }

  // Returns the time in (xx seconds/minuts/hours ago) when the worker has last fetched new markets from the exchange
  lastReloadMarketFromNow () {
    if (!this.lastReloadMarketsAt) return 0
    return moment(this.lastReloadMarketsAt).fromNow()
  }

  // Returns true or false when we need to restart the worker
  // Some exchanges (like Binance) don't allow forever connections. We need to restart the connection to the API once in a while
  shouldRestartNow () {
    if (!this.restartAfterHours) return false
    return this.runningTime('hours') > this.restartAfterHours
  }

  // Returns true when we need to fetch the latest markets data from the exchange again
  shouldReloadMarketsNow () {
    if (!this.reloadMarketsAfterMinutes) return false
    return this.runningTimeAfterLastReload('minutes') > this.reloadMarketsAfterMinutes
  }

  // Returns the time in minutes to restart the worker
  timeToRestart () {
    if (!this.restartAfterHours) return false
    return (this.restartAfterHours * 60) - this.runningTime('minutes') + ' minutes'
  }

  // Returns the time in minutes when we need to fetch the markets data again from the exchange API
  timeToReloadMarkets () {
    if (!this.reloadMarketsAfterMinutes) return false
    return this.reloadMarketsAfterMinutes - this.runningTimeAfterLastReload('minutes') + ' minutes'
  }

  // Sets the last date in the instance ánd in Redis, so we know what's going on whe we monitor the worker
  setLastDate (type) {
    // lastUpdateAt, lastErrorAt, lastCheckedAt, lastResetAt, lastRestartedAt, lastReloadMarketsAt
    this[type] = new Date()
    redis.hset(this.cacheKey['status'], type, this[type])
  }

  setIncrementTotals (type) {
    // totalUpdates, totalErrors, totalReloadsMarkets
    this[type] = this[type] + 1
    redis.hset(this.cacheKey['status'], type, this[type])
  }

  // Creates an instance of CCXT to be used by the worker
  async createCCXTInstance () {
    this.deleteCCXTInstance()

    try {
      this.ccxt = new ccxt[this.exchangeSlug]({
        enableRateLimit: true,
        timeout: 5000
      })

      // Now, store the available markets in Redis, so we can use this for other things
      // Market data is needed for the Transformers and for CCXT to work correctly
      // Since the worker is a long running process, markets at an exchange can change
      // We just make sure we got the latest market data
      await this.saveMarkets()
    } catch(e) {
      // throw new Error('Error hier')
      this.handleCCXTExchangeError(e)
    }
  }

  async saveMarkets () {
    try {
      const markets = await this.ccxt.loadMarkets()
      this.setLastDate('lastReloadMarketsAt')
      this.setIncrementTotals('totalReloadsMarkets')

      // When we got markets, delete old cache, add new cache and return the markets
      if (Object.keys(markets).length) {
        // Delete the cache first, then add the new markets
        // Essentially removing markets the exchange already removed
        await this.deleteCache(this.cacheKey['markets'])

        // Prepare the data for Redis HMSET
        // Returing a new Object like: "ETH/BTC": { string }
        const marketsStringHMSET = this.convertToHMSETString(markets)

        // Use Redis HMSET to set all the keys at once
        redis.hmset(this.cacheKey['markets'], marketsStringHMSET)

        console.log(`${this.exchangeName} Worker:`, 'Saved markets')
        return markets
      } else {
        return null
      }
    } catch(e) {
      console.log(`${this.exchangeName} Worker:`, 'Error', 'Saving markets failed')
    }
  }

  deleteCCXTInstance () {
    if (this.ccxt && this.ccxt[this.exchangeSlug]) {
      delete this.ccxt[this.exchangeSlug]
    }
    this.ccxt = null
    return this.ccxt
  }

  convertToHMSETString (data) {
    // Prepare the data for Redis HMSET
    // Returing a new Object like: "ETH/BTC": { string }
    // "ETH/BTC" will be the hash key
    return Object.entries(data).reduce((result, object) => {
      result[object[0]] = JSON.stringify(data[object[0]])
      return result
    }, {})
  }

  resetCCXT () {
    this.setLastDate('lastResetAt')
    this.deleteCCXTInstance()
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }

  async checkReloadMarkets () {
    if (this.shouldReloadMarketsNow()) {
      await this.saveMarkets()
    }
  }

  startInterval (ccxtMethod, intervalTime = 2000) {
    interval(async (iteration, stop) => {

      await this.checkReloadMarkets()

      if (this.shouldRestartNow()) {
        this.resetCCXT()
      } else {
        try {
          this.setLastDate('lastCheckedAt')
          const result = await this.ccxt[ccxtMethod]()
          if (result) {
            this.setIncrementTotals('totalUpdates')
            this.setLastDate('lastUpdateAt')
            this.cacheTickers(result)
          }
        } catch (e) {
          this.handleCCXTExchangeError(e)
        }
      }
    }, intervalTime, {stopOnError: false})
  }

  stringifyData (data) {
    return (typeof data === 'string') ? data : JSON.stringify(data)
  }

  getDataLength (data) {
    return (typeof data === 'string') ? Object.keys(JSON.parse(data)).length : Object.keys(data).length
  }

  async cacheTicker (ticker) {
    await redis.hset(this.cacheKey['tickers'], ticker.symbol, JSON.stringify(ticker))
    this.redisPublishChangeTicker(ticker.symbol, ticker)
    this.redisPublishChangeExchange(ticker)
    // console.log(`${this.exchangeName} Worker:`, 'Redis', 'Saved Ticker')
  }

  async cacheTickers (tickers) {
    try {
      const totalTickers = this.getDataLength(tickers)
      const tickersString = this.stringifyData(tickers)
      const tickersStringHMSET = this.convertToHMSETString(tickers) // Prepare the data for Redis HMSET. Returing a new Object like: "ETH/BTC": { string }

      // Store each ticker in it's own key
      await redis.hmset(this.cacheKey['tickers'], tickersStringHMSET)

      // Store object of all keys in "all"
      await redis.hset(this.cacheKey['tickers'], 'all', tickersString)

      // Publish change for each symbol
      Object.keys(tickers).forEach(symbol => {
        this.redisPublishChangeTicker(symbol, tickers[symbol])
      })

      // Publish change for exchange
      this.redisPublishChangeExchange(tickers)

      console.log(`${this.exchangeName} Worker:`, 'Redis', 'Saved Tickers', totalTickers)
    } catch(e) {
      this.setLastDate('lastErrorAt')
      this.setIncrementTotals('totalErrors')
      console.log(`${this.exchangeName} Worker:`, 'Error getting cached market data to compare', this.exchangeName, e)
    }
  }

  redisPublishChangeTicker (symbol, ticker) {
    // Publishing something like this: TICKERS~BITTREX~BTC/USDT
    redisPub.publish(`TICKERS~${this.exchangeCapitalized}~${symbol}`, JSON.stringify(ticker))
  }

  redisPublishChangeExchange (tickers) {
    // Publishing something like this: TICKERS~BITTREX~NEW
    redisPub.publish(`TICKERS~${this.exchangeCapitalized}~NEW`, JSON.stringify(tickers))
  }

  async deleteCache (key) {
    console.log(`${this.exchangeName} Worker:`, 'Delete Cache', key)
    const result = await redis.keys(key)
    .then(keys => {
      const pipeline = redis.pipeline()
      keys.forEach(key => {
        pipeline.del(key)
      })
        return pipeline.exec()
    })
    return result
  }

  handleCCXTExchangeError (e) {
    this.setLastDate('lastErrorAt')
    this.setIncrementTotals('totalErrors')
    // console.log(`${this.exchangeName} Worker:`, 'CCXT error', e)


    if (e instanceof ccxt.DDoSProtection || e.message.includes('ECONNRESET')) {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'DDOS Protection', e)
    } else if (e instanceof ccxt.RequestTimeout) {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'Request Timeout', e)
    } else if (e instanceof ccxt.AuthenticationError) {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'Authentication Error', e)
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'Exchange Not Available', e)
    } else if (e instanceof ccxt.ExchangeError) {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'Exchange Error', e)
    } else if (e instanceof ccxt.NetworkError) {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'Network Error', e)
    } else {
      console.log(`${this.exchangeName} Worker:`, 'CCXT Error', 'Unexpected Error', e)
      // Rethrow an unexpected error
      throw e
    }
  }

  handleSentryError (message) {
    try {
      throw new Error(message);
    } catch (e) {
      // You can get eventId either as the synchronous return value, or via the callback
      var eventId = Raven.captureException(e, function (sendErr, eventId) {
        // This callback fires once the report has been sent to Sentry
        console.log('\nWorker Error: Unhandled exception captured by Sentry:\n')
        console.log('==========\n')
        console.log(e.message)
        console.log('\n==========\n')
        if (sendErr) {
          console.error('Worker Error:', 'Failed to send captured exception to Sentry');
        } else {
          console.log('Worker Error:', 'Captured exception and send to Sentry successfully');
        }
      });
    }
  }
}

module.exports = Worker
