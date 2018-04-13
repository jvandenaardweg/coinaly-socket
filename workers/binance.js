/*
Binance API Docs: https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md
*/
"use strict";
const Worker = require('./worker')
const WebSocket = require('ws')
const BinanceTransformer = require('../transformers/binance')

class Binance extends Worker {
  constructor () {
    super('Binance')
    this.websocketEndpoint = 'wss://stream.binance.com:9443/ws/!ticker@arr'
    this.restartAfterHours = 12 // Binance API docs state a Websocket connection gets disconnected after 24 hours. We just restart it way before that.
  }

  async start () {
    try {
      // Create a CCXT instance, available at "this.ccxt"
      await this.createCCXTInstance()

      // Create a transformer and give it the CCXT methods to transform data into the proper data model
      this.transformer = new BinanceTransformer(this.ccxt)

      this.websocket = new WebSocket(this.websocketEndpoint)

      // Listen for events
      this.websocket.addEventListener('error', this.handleError.bind(this))
      this.websocket.on('open', this.handleOpen.bind(this))
      this.websocket.on('message', this.handleMessage.bind(this)) // Event that receives the data
    } catch (e) {
      this.handleCatch(e)
    }
  }

  handleMessage (data) {
    this.setLastCheckedAt()
    if (data) {
      const json = (typeof data === 'string') ? JSON.parse(data) : data
      const tickers = this.transformer.transformMultipleObjects(json)
      this.setTotalUpdates()
      this.setLastUpdateAt()
      this.cacheTickers(tickers, this.exchangeName)
      this.checkReloadMarkets() // Checks if market needs to be reloaded, if so, it will fetch the new markets from the API
    } else {
      console.log(`${this.exchangeName} Websocket:`, 'Received a message but not data.')
    }
  }

  handleCatch (e) {
    console.log(`${this.exchangeName} Websocket:`, 'There was an error.', e)
  }

  handleOpen () {
    console.log(`${this.exchangeName} Websocket:`, 'Opened Connection.')
  }

  handleError (error) {
    this.handleSentryError(`${this.exchangeName} Worker: Websocket Error: ${error.message}`)
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.websocket.terminate()
    this.setLastRestartedAt()
    this.start()
  }
}

module.exports = Binance
