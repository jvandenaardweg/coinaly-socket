"use strict";
var Raven = require('raven');
Raven.config('https://386d9fe693df4a56b26b1a549d0372a0:f6d8e784e378493e8cf1556660b1cad6@sentry.io/711243').install();
const redis = require('../redis')
const Redis = require('ioredis');
const redisPub = new Redis(process.env.REDIS_URL);
const md5 = require('md5')
const moment = require('moment')

class Worker {
  constructor (name) {
    this.exchangeName = name
    this.exchangeNameLowerCased = this.exchangeName.toLowerCase()
    this.redisPub = redisPub
    this.startedAt = new Date()
    this.restartNow = false
    this.restartedAt = null
    this.totalUpdates = 0
    this.lastUpdateAt = null
    this.lastErrorAt = null
  }

  runningTime (unitOfTime) {
    return moment().diff(this.startedAt, unitOfTime) // seconds, hours, minutes etc...
  }

  lastUpdateFromNow () {
    return moment(this.lastUpdateAt).fromNow()
  }

  cacheMarkets (marketsData) {
    const totalMarkets = (typeof marketsData === 'string') ? JSON.parse(marketsData).length : Object.keys(marketsData).length
    const marketsDataString = (typeof marketsData === 'string') ? marketsData : JSON.stringify(marketsData)

    redis.hget(`exchange:${this.exchangeNameLowerCased}:markets`, 'all')
    .then(cachedResult => {
      const stringifedCachedResult = JSON.stringify(cachedResult)

      // If the data changed, store it in Redis
      if (md5(marketsDataString) !== md5(stringifedCachedResult)) {
        redis.hset(`exchange:${this.exchangeNameLowerCased}:markets`, 'all', marketsDataString)
        this.redisPublishChange(this.exchangeNameLowerCased)
        console.log(`${this.exchangeName} Worker:`, 'Redis', 'Saved Markets', totalMarkets)
      }

    })
    .catch(error => {
      console.log(`${this.exchangeName} Worker:`, 'Error getting cached market data to compare', this.exchangeName, error)
    })
  }

  redisPublishChange () {
    redisPub.publish('exchangeMarketsUpdate', this.exchangeNameLowerCased)
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
        if (sendErr) {
          console.error('Worker Error:', 'Failed to send captured exception to Sentry');
        } else {
          console.log('Worker Error:', 'Captured exception and send to Sentry successfully');
        }
        console.log('\n==========\n')
      });
    }
  }
}

module.exports = Worker
