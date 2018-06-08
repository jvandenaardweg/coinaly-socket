// API Docs Poloniex: https://poloniex.com/support/api/

const Worker = require('./worker')
const ccxt = require('ccxt')
const autobahn = require('autobahn')
const WebSocket = require('ws')
const PoloniexTransformer = require('../transformers/poloniex')

class Poloniex extends Worker {
  constructor () {
    super('Poloniex')
    this.websocketEndpoint = 'wss://api2.poloniex.com'
    this.marketsMapping = null
    this.channelsMapping = {
      trollbox: 1001,
      ticker: 1002,
      footer: 1003,
      heartbeat: 1010,
    };
    // this.restartAfterHours = 12 // Binance API docs state a Websocket connection gets disconnected after 24 hours. We just restart it way before that.
  }

  async start () {
    try {
      // Create a CCXT instance, available at "this.ccxt"
      // We do this because we need to market data thats fetched upon creation of that CCXT instance
      await this.createCCXTInstance()

      // Create a transformer and give it the CCXT instance
      // So the transformer has access to all the goodies CCXT gives us
      this.transformer = new PoloniexTransformer(this.ccxt)

      console.log(`${this.exchangeName} Websocket:`, 'Opening Websocket Connection...')

      // Now creating the connection...
      this.websocket = new WebSocket(this.websocketEndpoint)

      // Listen for events
      this.websocket.addEventListener('error', this.handleError.bind(this))
      this.websocket.on('open', this.handleOpen.bind(this))
      this.websocket.on('close', this.handleClose.bind(this))
      this.websocket.on('message', this.handleMessage.bind(this)) // Event that receives the data
    } catch (e) {
      this.handleCatch(e)
    }
  }

  handleClose () {
    clearInterval(this.websocket.keepAliveId)
  }

  handleMessage (raw) {
    this.setLastDate('lastCheckedAt')

    const message = JSON.parse(raw)
    const ticker = message[2]

    if (ticker) {
      // Transform the raw ticker data we get from the exchange into the CCXT data structure
      const transformedTicker = this.transformer.transformSingleObject(ticker)
      this.setIncrementTotals('totalUpdates')
      this.setLastDate('lastUpdateAt')
      this.cacheTickers(transformedTicker, this.exchangeName)
      this.checkReloadMarkets() // Checks if market needs to be reloaded, if so, it will fetch the new markets from the API
    }
  }

  handleCatch (e) {
    console.log(`${this.exchangeName} Websocket:`, 'There was an error.', e)
  }

  handleOpen (e) {
    this.websocket.keepAliveId = setInterval(() => {
      this.websocket.send('.')
    }, 60000)

    this.websocket.send(JSON.stringify({command: 'subscribe', channel: this.channelsMapping['trollbox']}))
    this.websocket.send(JSON.stringify({command: 'subscribe', channel: this.channelsMapping['ticker']}))
    this.websocket.send(JSON.stringify({command: 'subscribe', channel: this.channelsMapping['footer']}))

    console.log(`${this.exchangeName} Websocket:`, 'Opened Connection.')
  }

  handleError (error) {
    const code = error.error.code
    const message = error.message
    console.log(`${this.exchangeName} Websocket:`, 'Error', code, message)

    if (code === 'ENOTFOUND') {
      console.log(`${this.exchangeName} Websocket:`, 'Error', 'Probably the host is not reachable or you dont have a active internet connection.')
    }

    this.tryRestart()

  }

  tryRestart () {
    this.restartTimeout = setTimeout(() => {
      console.log(`${this.exchangeName} Websocket:`, 'Trying are websocket restart after error...')
      this.restart()
    }, 2000)
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.websocket.terminate()
    this.setLastDate('lastRestartedAt')
    this.start()
    clearTimeout(this.restartTimeout)
  }
}


// class Poloniex extends Worker {
//   constructor () {
//     super('Poloniex')
//     this.websocketEndpoint = 'wss://api.poloniex.com'
//   }

//   startPolling () {
//     this.createCCXTInstance()
//     this.startInterval('fetchTickers')
//   }

//   async start () {
//     try {

//       clearTimeout(this.restartTimeout)

//       await this.createCCXTInstance()

//       this.transformer = new PoloniexTransformer(this.ccxt)

//       console.log(`${this.exchangeName} Websocket:`, 'Opening Websocket Connection...')

//       this.websocket = new autobahn.Connection({
//         url: this.websocketEndpoint,
//         realm: 'realm1'
//       });

//       this.websocket.onopen = (session) => {
//         console.log(`${this.exchangeName} Websocket:`, 'Opened Connection.');
//         console.log(`${this.exchangeName} Websocket:`, 'Subscribing to ticker stream...');


//         function trollboxEvent (args,kwargs) {
//           console.log(args);
//         }

//         function tickerEvent (data, kwargs) {
//           console.log('POLONIEX TICKER', data)
//           this.setLastDate('lastCheckedAt')
//           if (data) {
//             const json = (typeof args === 'string') ? JSON.parse(data) : data
//             const ticker = this.transformer.transformSingleObject(json)
//             // console.log(ticker)
//             this.setIncrementTotals('totalUpdates')
//             this.setLastDate('lastUpdateAt')
//             this.cacheTicker(ticker)
//             this.checkReloadMarkets() // Checks if market needs to be reloaded, if so, it will fetch the new markets from the API
//           } else {
//             console.log(`${this.exchangeName} Websocket:`, 'Received a message but not data.')
//           }
//         }

//         // session.subscribe('BTC_XMR', marketEvent);
//         session.subscribe('ticker', tickerEvent)
//         session.subscribe('trollbox', trollboxEvent)
//       }

//       this.websocket.onclose = (message) => {
//         console.log(`${this.exchangeName} Websocket:`, 'Connection closed.', message)
//         this.restart()
//       }

//       this.websocket.open()
//     } catch (e) {
//       console.log('POLONIEX WEBSOCKET ERROR', e)
//     }

//   }

//   restart () {
//     console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
//     this.restartTimeout = setTimeout(() => {
//       this.websocket.close()
//       this.start()
//     }, 5000)

//   }
// }

module.exports = Poloniex
