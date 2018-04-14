/*
Binance API Docs: https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md
*/
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
      // We do this because we need to market data thats fetched upon creation of that CCXT instance
      await this.createCCXTInstance()

      // Create a transformer and give it the CCXT instance
      // So the transformer has access to all the goodies CCXT gives us
      this.transformer = new BinanceTransformer(this.ccxt)

      // Now creating the connection...
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
    this.setLastDate('lastCheckedAt')
    if (data) {
      const json = (typeof data === 'string') ? JSON.parse(data) : data
      const tickers = this.transformer.transformMultipleObjects(json)
      this.setIncrementTotals('totalUpdates')
      this.setLastDate('lastUpdateAt')
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
    const code = error.error.code
    const message = error.message
    console.log(`${this.exchangeName} Websocket:`, 'Error', code, message)

    if (code === 'ENOTFOUND') {
      console.log(`${this.exchangeName} Websocket:`, 'Error', 'Probably the host is not reachable or you dont have a active internet connection.')
    }

    // console.log('komt hierin', Object.keys(error.error.code))
    // this.handleSentryError(`${this.exchangeName} Worker: Websocket Error: ${error.message}`)
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.websocket.terminate()
    this.setLastDate('lastRestartedAt')
    this.start()
  }
}

module.exports = Binance
