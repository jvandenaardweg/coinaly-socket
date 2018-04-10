/*
API Docs: https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md
*/
"use strict";
require('dotenv').config();
const Worker = require('./worker')
const ccxt = require('ccxt')
const redis = require('../redis')
const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL);
const interval = require('interval-promise');

class Kraken extends Worker {
  constructor () {
    super('Kraken')

    try {
      this.ccxt = new ccxt.kraken({
        enableRateLimit: true,
        timeout: 15000,
        verbose: false
      })
    } catch (e) {
      console.log(e)
    }

  }

  start () {
    interval(async () => {
      try {
        const result = await this.ccxt.fetchTickers()
        this.totalUpdates = this.totalUpdates + 1
        this.lastUpdateAt = new Date()
        this.cacheMarkets(result, this.exchangeName)
      } catch (e) {
        this.handleCCXTExchangeError(this.ccxt, e)
      }
    }, 2000, {stopOnError: false})
  }
}

module.exports = Kraken
