/*
API Docs: https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md
*/
"use strict";
require('dotenv').config()
const Worker = require('./worker')
const WebSocket = require('ws')
const redis = require('../redis')
const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL);
const moment = require('moment')
const BinanceTransformer = require('../transformers/binance')
const util = require('util')
// console.log(util.inspect(this.ccxt.marketsById['RPXBTC'], { depth: 1}))

class Binance extends Worker {
  constructor () {
    super('Binance')
    this.websocketEndpoint = 'wss://stream.binance.com:9443/ws/!ticker@arr'
    this.restartAfterHours = 12 // Binance API docs state a Websocket connection gets disconnected after 24 hours. We just restart it way before that.

  }

  handleWebsocketError (error) {
    this.handleSentryError(`${this.exchangeName} Worker: Websocket Error: ${error.message}`)
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.websocket.terminate()
    this.restartedAt = new Date()
    this.start()
  }

  async start () {

    // Create a CCXT instance, available at "this.ccxt"
    await this.createCCXTInstance()

    // Create a transformer and give it the CCXT methods to transform data into the proper data model
    this.transformer = new BinanceTransformer(this.ccxt)

    this.websocket = new WebSocket(this.websocketEndpoint)

    this.websocket.addEventListener('error', this.handleWebsocketError.bind(this))

    this.websocket.on('open', () => {
      console.log(`${this.exchangeName} Websocket:`, 'Opened Connection.')
    })

    this.websocket.on('message', (data) => {
      const tickers = this.transformer.transformMultipleObjects(data)
      this.totalUpdates = this.totalUpdates + 1
      this.lastUpdateAt = new Date()
      this.cacheTickers(tickers, this.exchangeName)

      Object.keys(tickers).forEach(symbol => {
        this.cacheTicker(tickers[symbol])
      })
    })
  }
}

module.exports = Binance
