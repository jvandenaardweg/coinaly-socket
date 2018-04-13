"use strict";
require('dotenv').config()
var Raven = require('raven')
Raven.config(process.env.SENTRY_DSN).install()
const redis = require('../redis')
const Redis = require('ioredis')
const redisPub = new Redis(process.env.REDIS_URL)
const md5 = require('md5')
const moment = require('moment')
const interval = require('interval-promise')
const ccxt = require('ccxt')

class Worker {
  constructor (name) {
    this.exchangeName = name || 'Unknown'
    this.exchangeSlug = this.exchangeName.toLowerCase()
    this.redisPub = redisPub
    this.startedAt = new Date()
    this.restartNow = false
    this.restartedAt = null
    this.totalUpdates = 0
    this.lastUpdateAt = null
    this.lastErrorAt = null
    this.lastCheckedAt = null
    this.totalErrors = 0
    this.totalReloadsMarkets = 0
    this.restartAfterHours = null
    this.lastResetAt = null
    this.reloadMarketsAfterMinutes = 60 // Reload the markets data every hour
    this.lastReloadMarketsAt = null
    this.cacheKey = {
     'tickers': `exchanges:${this.exchangeSlug}:tickers`,
     'markets': `exchanges:${this.exchangeSlug}:markets`,
     'status': `workers:${this.exchangeSlug}:status`
    }
    redis.hset(this.cacheKey['status'], 'startedAt', this.startedAt)
  }

  runningTime (unitOfTime) {
    let timeToUse
    if (this.restartedAt) {
      timeToUse = this.restartedAt
    } else {
      timeToUse = this.startedAt
    }

    if (timeToUse) return moment().diff(timeToUse, unitOfTime) // seconds, hours, minutes etc...
    return 0
  }

  runningTimeAfterLastReload (unitOfTime) {
    let timeToUse
    if (this.lastReloadMarketsAt) {
      timeToUse = this.lastReloadMarketsAt
    }

    if (timeToUse) return moment().diff(timeToUse, unitOfTime) // seconds, hours, minutes etc...
    return 0
  }

  lastUpdateFromNow () {
    if (this.lastUpdateAt) return moment(this.lastUpdateAt).fromNow()
    return 0
  }

  lastReloadMarketFromNow () {
    if (this.lastReloadMarketsAt) return moment(this.lastReloadMarketsAt).fromNow()
    return 0
  }

  shouldRestartNow () {
    if (this.restartAfterHours) {
      return this.runningTime('hours') > this.restartAfterHours
    } else {
      return false
    }
  }

  shouldReloadMarketsNow () {
    if (this.reloadMarketsAfterMinutes) {
      return this.runningTimeAfterLastReload('minutes') > this.reloadMarketsAfterMinutes
    } else {
      return false
    }
  }

  timeToRestart () {
    if (this.restartAfterHours) {
      return (this.restartAfterHours * 60) - this.runningTime('minutes') + ' minutes'
    } else {
      return false
    }
  }

  timeToReloadMarkets () {
    if (this.reloadMarketsAfterMinutes) {
      return this.reloadMarketsAfterMinutes - this.runningTimeAfterLastReload('minutes') + ' minutes'
    } else {
      return false
    }
  }

  setLastUpdateAt () {
    this.lastUpdateAt = new Date()
    redis.hset(this.cacheKey['status'], 'lastUpdateAt', this.lastUpdateAt)
  }

  setLastErrorAt () {
    this.lastErrorAt = new Date()
    redis.hset(this.cacheKey['status'], 'lastErrorAt', this.lastErrorAt)
  }

  setLastCheckedAt () {
    this.lastCheckedAt = new Date()
    redis.hset(this.cacheKey['status'], 'lastCheckedAt', this.lastCheckedAt)
  }

  setTotalUpdates () {
    this.totalUpdates = this.totalUpdates + 1
    redis.hset(this.cacheKey['status'], 'totalUpdates', this.totalUpdates)
  }

  setTotalErrors () {
    this.totalErrors = this.totalErrors + 1
    redis.hset(this.cacheKey['status'], 'totalErrors', this.totalErrors)
  }

  setLastResetAt () {
    this.lastResetAt = new Date()
    redis.hset(this.cacheKey['status'], 'lastResetAt', this.lastResetAt)
  }

  setTotalReloadsMarkets () {
    this.totalReloadsMarkets = this.totalReloadsMarkets + 1
    redis.hset(this.cacheKey['status'], 'totalReloadsMarkets', this.totalReloadsMarkets)
  }

  setLastReloadMarketsAt () {
    this.lastReloadMarketsAt = new Date()
    redis.hset(this.cacheKey['status'], 'lastReloadMarketsAt', this.lastReloadMarketsAt)
  }

  async createCCXTInstance () {
    if (this.ccxt && this.ccxt[this.exchangeSlug]) {
      delete this.ccxt[this.exchangeSlug]
    }

    this.ccxt = {}

    try {
      this.ccxt = new ccxt[this.exchangeSlug]({
        enableRateLimit: true,
        timeout: 15000
      })

      // Store the available markets in Redis, so we can use this for other things
      // Market data is needed for the Transformers
      await this.saveMarkets()
    } catch(e) {
      this.handleCCXTExchangeError(e)
    }
  }

  async saveMarkets () {
    try {
      const markets = await this.ccxt.loadMarkets()
      this.setLastReloadMarketsAt()
      this.setTotalReloadsMarkets()

      // When we got markets, delete old cache, add new cache and return the markets
      if (Object.keys(markets).length) {
        // Delete the cache first, then add the new markets (essentially removing markets the exchange already removed)
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
    if (this.ccxt[this.exchangeSlug]) {
      delete this.ccxt[this.exchangeSlug]
    }
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
    this.setLastResetAt()
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
          this.setLastCheckedAt()
          const result = await this.ccxt[ccxtMethod]()
          if (result) {
            this.setTotalUpdates()
            this.setLastUpdateAt()
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
    return (typeof data === 'string') ? JSON.parse(data).length : Object.keys(data).length
  }

  isDataChanged (left, right) {
    if (left && right) {
      return md5(left) !== md5(right)
    } else {
      return true
    }
  }

  async cacheTickers (tickers) {
    try {
      let stringifedCachedResult = null
      const totalTickers = this.getDataLength(tickers)
      const tickersString = this.stringifyData(tickers)

      const cachedResult = await redis.hget(this.cacheKey['tickers'], 'all')

      // Prepare the data for Redis HMSET
      // Returing a new Object like: "ETH/BTC": { string }
      const tickersStringHMSET = this.convertToHMSETString(tickers)

      redis.hmset(this.cacheKey['tickers'], tickersStringHMSET)

      if (cachedResult) {
        stringifedCachedResult = JSON.stringify(cachedResult)
      }

      // If the data changed, store it in Redis
      if (this.isDataChanged(tickersString, stringifedCachedResult)) {
        await redis.hset(this.cacheKey['tickers'], 'all', tickersString)
        this.redisPublishChange(this.exchangeSlug)
        console.log(`${this.exchangeName} Worker:`, 'Redis', 'Saved Tickers', totalTickers)
      }
    } catch(e) {
      this.setLastErrorAt()
      this.setTotalErrors()
      console.log(`${this.exchangeName} Worker:`, 'Error getting cached market data to compare', this.exchangeName, e)
    }
  }

  async cacheTicker (ticker) {
    try {
      let stringifedCachedResult = null
      const tickerString = this.stringifyData(ticker)

      const cachedResult = await redis.hget(this.cacheKey['tickers'], ticker.symbol)

      if (cachedResult) {
        stringifedCachedResult = JSON.stringify(cachedResult)
      }

      // If the data changed, store it in Redis
      if (this.isDataChanged(tickerString, stringifedCachedResult)) {
        await redis.hset(this.cacheKey['tickers'], ticker.symbol, tickerString)
        this.redisPublishChange(this.exchangeSlug)
        redisPub.publish('exchangeTickerUpdate', ticker.symbol)
        // console.log(`${this.exchangeName} Worker:`, 'Redis', 'Saved Ticker', ticker.symbol)
      }
    } catch(e) {
      this.setLastErrorAt()
      this.setTotalErrors()
      console.log(`${this.exchangeName} Worker:`, 'Error getting cached market data to compare', this.exchangeName, e)
    }
  }

  redisPublishChange () {
    redisPub.publish('exchangeTickersUpdate', this.exchangeSlug)
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
    this.setLastErrorAt()
    this.setTotalErrors()
    console.log('CCXT error', e)
    redis.hset(this.cacheKey['status'], 'errorMessage', JSON.stringify(e))

    // TODO: restart worker when: CCXT error TypeError: Cannot read property 'symbol' of undefined

    let message
    let reason = null
    let exchangeErrorCode = null
    if (e instanceof ccxt.DDoSProtection || e.message.includes('ECONNRESET')) {
      // log.bright.yellow('[DDoS Protection] ' + e.message)
      message = e.message
      reason = 'ddos protection'
      console.log('CCXT:', 'Error', 'DDOS Protection')
    } else if (e instanceof ccxt.RequestTimeout) {
      // log.bright.yellow('[Request Timeout] ' + e.message)
      message = e.message
      reason = 'request timeout'
      console.log('CCXT:', 'Error', 'Request Timeout')
    } else if (e instanceof ccxt.AuthenticationError) {
      // log.bright.yellow('[Authentication Error] ' + e.message)
      message = e.message
      reason = 'authentication error'
      console.log('CCXT:', 'Error', 'Authenticfation Error')
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
      // log.bright.yellow('[Exchange Not Available Error] ' + e.message)
      message = e.message
      reason = 'exchange not available error'
      console.log('CCXT:', 'Error', 'Exchange Not Available')
    } else if (e instanceof ccxt.ExchangeError) {
      // log.bright.yellow('[Exchange Error] ' + e.message)
      message = e.message
      reason = 'exchange error'
      console.log('CCXT:', 'Error', 'Exchange Error')
    } else if (e instanceof ccxt.NetworkError) {
      // log.bright.yellow('[Network Error] ' + e.message)
      message = e.message
      reason = 'network error'
      console.log('CCXT:', 'Error', 'Network Error')
    } else {
      message = e.message
    }

    console.log('ERROR!!', `${this.exchangeName} Worker:`, 'CCXT Error', message)
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
