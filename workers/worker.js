"use strict";
require('dotenv').config()
var Raven = require('raven')
Raven.config('https://386d9fe693df4a56b26b1a549d0372a0:f6d8e784e378493e8cf1556660b1cad6@sentry.io/711243').install()
const redis = require('../redis')
const Redis = require('ioredis')
const redisPub = new Redis(process.env.REDIS_URL)
const md5 = require('md5')
const moment = require('moment')
const interval = require('interval-promise')

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
    this.restartAfterHours = null
    this.cacheKey = {
     'tickers': `exchange:${this.exchangeSlug}:tickers`
    }
  }

  runningTime (unitOfTime) {
    if (this.startedAt) return moment().diff(this.startedAt, unitOfTime) // seconds, hours, minutes etc...
    return 0
  }

  lastUpdateFromNow () {
    if (this.lastUpdateAt) return moment(this.lastUpdateAt).fromNow()
    return 0
  }

  shouldRestartNow () {
    return this.runningTime('hours') > this.restartAfterHours // Restart this worker after 12 hours (Binance requires to restart the websocket connection after 24 hours)
  }

  timeToRestart () {
    if (this.restartAfterHours) {
      return (this.restartAfterHours * 60) - this.runningTime('minutes') + ' minutes'
    } else {
      return false
    }
  }

  setLastUpdateAt () {
    this.lastUpdateAt = new Date()
  }

  setTotalUpdates () {
    this.totalUpdates = this.totalUpdates + 1
  }

  startInterval (ccxtMethod, intervalTime = 2000) {
    interval(async () => {
      try {
        const result = await this.ccxt[ccxtMethod]()
        this.setTotalUpdates()
        this.setLastUpdateAt()
        this.cacheTickers(result)
      } catch (e) {
        this.handleCCXTExchangeError(this.ccxt, e)
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
    return md5(left) !== md5(right)
  }

  async cacheTickers (tickersData) {
    try {
      let stringifedCachedResult = null
      const totalTickers = this.getDataLength(tickersData)
      const tickersDataString = this.stringifyData(tickersData)

      const cachedResult = await redis.hget(this.cacheKey['tickers'], 'all')

      if (cachedResult) {
        stringifedCachedResult = JSON.stringify(cachedResult)
      }

      // If the data changed, store it in Redis
      if (this.isDataChanged(tickersDataString, stringifedCachedResult)) {
        await redis.hset(this.cacheKey['tickers'], 'all', tickersDataString)
        this.redisPublishChange(this.exchangeSlug)
        console.log(`${this.exchangeName} Worker:`, 'Redis', 'Saved Tickers', totalTickers)
      }
    } catch(e) {
      console.log(`${this.exchangeName} Worker:`, 'Error getting cached market data to compare', this.exchangeName, e)
    }
  }

  redisPublishChange () {
    redisPub.publish('exchangeTickersUpdate', this.exchangeSlug)
  }

  handleCCXTExchangeError (ccxt, e) {
    this.lastErrorAt = new Date()
    console.log('CCXT error', e)
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
