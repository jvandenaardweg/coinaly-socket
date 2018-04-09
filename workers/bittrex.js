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

class Bittrex extends Worker {
  constructor () {
    super('Bittrex')

    this.ccxt = new ccxt.bittrex({
      apiKey: process.env.BITTREX_API_KEY,
      secret: process.env.BITTREX_API_SECRET,
      timeout: 15000
    })
  }

  start () {
    this.startedSince = new Date()
    
    interval(async () => {
      try {
        const result = await this.ccxt.fetchTickers()
        this.cacheMarkets(result, this.exchangeName)
      } catch (e) {
        this.handleCCXTExchangeError(this.ccxt, e)
      }
    }, 2000, {stopOnError: false})
  }
}

module.exports = Bittrex
