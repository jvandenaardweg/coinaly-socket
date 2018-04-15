// API Docs Poloniex: https://poloniex.com/support/api/

const Worker = require('./worker')
const ccxt = require('ccxt')
const autobahn = require('autobahn')
const PoloniexTransformer = require('../transformers/poloniex')

class Poloniex extends Worker {
  constructor () {
    super('Poloniex')
    this.websocketEndpoint = 'wss://api.poloniex.com'
  }

  startPolling () {
    this.createCCXTInstance()
    this.startInterval('fetchTickers')
  }

  async start () {
    try {

      clearTimeout(this.restartTimeout)

      await this.createCCXTInstance()

      this.transformer = new PoloniexTransformer(this.ccxt)

      console.log(`${this.exchangeName} Websocket:`, 'Opening Websocket Connection...')

      this.websocket = new autobahn.Connection({
        url: this.websocketEndpoint,
        realm: 'realm1'
      });

      this.websocket.onopen = (session) => {
        console.log(`${this.exchangeName} Websocket:`, 'Opened Connection.');
        console.log(`${this.exchangeName} Websocket:`, 'Subscribing to ticker stream...');


        function trollboxEvent (args,kwargs) {
          console.log(args);
        }
        // session.subscribe('BTC_XMR', marketEvent);
        session.subscribe('ticker', (data, kwargs) => {
          this.tickerEvent(data)
        })
        session.subscribe('trollbox', trollboxEvent)
      }

      this.websocket.onclose = (message) => {
        console.log(`${this.exchangeName} Websocket:`, 'Connection closed.', message)
        this.restart()
      }

      this.websocket.open()
    } catch (e) {
      console.log('POLONIEX WEBSOCKET ERROR', e)
    }

  }

  tickerEvent (data) {
    this.setLastDate('lastCheckedAt')
    if (data) {
      const json = (typeof args === 'string') ? JSON.parse(data) : data
      const ticker = this.transformer.transformSingleObject(json)
      // console.log(ticker)
      this.setIncrementTotals('totalUpdates')
      this.setLastDate('lastUpdateAt')
      this.cacheTicker(ticker)
      this.checkReloadMarkets() // Checks if market needs to be reloaded, if so, it will fetch the new markets from the API
    } else {
      console.log(`${this.exchangeName} Websocket:`, 'Received a message but not data.')
    }
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.restartTimeout = setTimeout(() => {
      this.websocket.close()
      this.start()
    }, 5000)

  }
}

module.exports = Poloniex
