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
const { convertObjectToKeyString, convertKeyStringToObject } = require('../helpers/objects')

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
    return redis.hset(this.cacheKey['status'], type, this[type])
  }

  setIncrementTotals (type) {
    // totalUpdates, totalErrors, totalReloadsMarkets
    this[type] = this[type] + 1
    return redis.hset(this.cacheKey['status'], type, this[type])
  }

  // Creates an instance of CCXT to be used by the worker
  async createCCXTInstance () {
    this.deleteCCXTInstance()

    try {
      this.ccxt = new ccxt[this.exchangeSlug]({
        enableRateLimit: true,
        timeout: 15000
      })

      // Now, store the available markets in Redis, so we can use this for other things
      // Market data is needed for the Transformers and for CCXT to work correctly
      // Since the worker is a long running process, markets at an exchange can change
      // We just make sure we got the latest market data
      await this.saveMarkets()
    } catch(e) {
      this.handleCCXTExchangeError(e)
    }
  }

  async saveMarkets () {
    try {
      const markets = await this.ccxt.loadMarkets()
      await this.setLastDate('lastReloadMarketsAt')
      await this.setIncrementTotals('totalReloadsMarkets')

      // When we got markets, delete old cache, add new cache and return the markets
      if (Object.keys(markets).length) {
        // Delete the cache first, then add the new markets
        // Essentially removing markets the exchange already removed
        await this.deleteCache(this.cacheKey['markets'])

        // Prepare the data for Redis HMSET
        // Returing a new Object like: "ETH/BTC": { string }
        const marketsStringHMSET = convertObjectToKeyString(markets)

        // Use Redis HMSET to set all the keys at once
        await redis.hmset(this.cacheKey['markets'], marketsStringHMSET)

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

  async resetCCXT () {
    await this.setLastDate('lastResetAt')
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
    let delay
    const exchangeRateLimit = this.ccxt.rateLimit

    // If the given intervalTime is lower then the rate limit, we use the rate limit
    if (intervalTime < exchangeRateLimit) {
      delay = exchangeRateLimit
    } else {
      delay = intervalTime
    }

    interval(async (iteration, stop) => {

      await this.checkReloadMarkets()

      if (this.shouldRestartNow()) {
        this.resetCCXT()
      } else {
        try {
          await this.setLastDate('lastCheckedAt')
          const result = await this.ccxt[ccxtMethod]()
          if (result) {
            await this.setIncrementTotals('totalUpdates')
            await this.setLastDate('lastUpdateAt')
            await this.cacheTickers(result)
          }
        } catch (e) {
          this.handleCCXTExchangeError(e)
        }
      }
    }, delay, {stopOnError: false})
  }

  getDataLength (data) {
    return (typeof data === 'string') ? Object.keys(JSON.parse(data)).length : Object.keys(data).length
  }

  async cacheTicker (ticker) {
    if (ticker.info) delete ticker.info // Minimize the ticker data. We probably don't need the info object, which contains the original exchange JSON data. So we remove it.
    await redis.hset(this.cacheKey['tickers'], ticker.symbol, JSON.stringify(ticker))
    await this.redisPublishChangeTicker(ticker.symbol, ticker)
  }

  async cacheTickers (tickers) {
    try {
      let isChanged = false // Used to check if this ticker data has a change, if so, we send an extra message to notify there's a change at an exchange
      let totalChanged = 0
      const totalTickers = this.getDataLength(tickers)
      const cachedTickers = await redis.hgetall(this.cacheKey['tickers']).then(result => convertKeyStringToObject(result))

      // Loop through the fresh tickers we got from the exchange
      // Cache each ticker seperately, so we can determine if a ticker has changed
      // We use a for loop so we can leverage async/await
      for (let symbol of Object.keys(tickers)) {
        const cachedTicker = cachedTickers[symbol]
        const freshTicker = tickers[symbol]

        // If we got cachedTickers, we can compare the freshTicker with the cachedTicker
        if (cachedTicker) {
          // If the timestamp of the fresh ticker is newer then the one in cache, we cache it
          if (freshTicker.timestamp > cachedTicker.timestamp) {
            isChanged = true
            totalChanged++
            await this.cacheTicker(freshTicker)
          }
        } else {
          // Ticker does not exist, just add it to the cache
          isChanged = true
          totalChanged++
          await this.cacheTicker(freshTicker)
        }
      }

      // Publish a message there's a change in tickers for exchange X
      if (isChanged) {
        const newlyCachedTickers = await redis.hgetall(this.cacheKey['tickers']).then(result => convertKeyStringToObject(result))
        // console.log(`${this.exchangeName} Worker:`, 'Got new tickers', totalChanged)
        await this.redisPublishChangeExchange(newlyCachedTickers)
      }

    } catch(e) {
      this.setLastDate('lastErrorAt')
      this.setIncrementTotals('totalErrors')
      console.log(`${this.exchangeName} Worker:`, 'Error getting cached market data to compare', this.exchangeName, e)
    }
  }

  redisPublishChangeTicker (symbol, ticker) {
    // Publishing something like this: TICKERS~BITTREX~BTC/USDT
    return redisPub.publish(`TICKERS~${this.exchangeCapitalized}~${symbol}`, JSON.stringify(ticker))
  }

  redisPublishChangeExchange (tickers) {
    // Publishing something like this: TICKERS~BITTREX
    return redisPub.publish(`TICKERS~${this.exchangeCapitalized}`, JSON.stringify(tickers))
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
