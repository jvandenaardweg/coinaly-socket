"use strict";
const redis = require('../redis')
const Redis = require('ioredis');
const redisPub = new Redis(process.env.REDIS_URL);
const md5 = require('md5')

class Worker {
  constructor (name) {
    this.exchangeName = name
    this.exchangeNameLowerCased = this.exchangeName.toLowerCase()
    this.redisPub = redisPub
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
  
    console.log('CCXT:', 'Error', e.message)
  }
}

module.exports = Worker
