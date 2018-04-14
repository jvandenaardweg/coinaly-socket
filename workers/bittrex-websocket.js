const Worker = require('./worker')
const ccxt = require('ccxt')
const signalR = require ('signalr-client')
const jsonic = require('jsonic')
const zlib = require('zlib')
const util = require('util')
const BittrexTransformer = require('../transformers/bittrex')

/*
Bittrex Websocket API: https://github.com/Bittrex/beta/blob/master/README.md#ws-api-overview
*/
class Bittrex extends Worker {
  constructor () {
    super('Bittrex')
    this.websocket = null
    this.websocketEndpoint = 'wss://beta.bittrex.com/signalr'
    this.restartAfterHours = 12 // We just restart the connection after some hours like we do with Binance
  }

  async start () {
    try {
      await this.createCCXTInstance()

      // Create a transformer and give it the CCXT instance
      // So the transformer has access to all the goodies CCXT gives us
      this.transformer = new BittrexTransformer(this.ccxt)

      this.websocket = new signalR.client(this.websocketEndpoint, ['c2'])

      // this.websocket.serviceHandlers.connected = (connection) => this.handleConnected(connection)
      this.websocket.serviceHandlers.messageReceived = (message) => this.handleMessage(message)
      this.websocket.serviceHandlers.onerror = (error) => this.handleError(error)
      this.websocket.serviceHandlers.connectionLost = (error) => this.handleConnectionLost(error)
      this.websocket.serviceHandlers.connectFailed = (error) => this.handleConnectFailed(error)
      this.websocket.serviceHandlers.disconnected = (connection) => this.handleDisconnected(connection)

      /*
      bound: void function(){}
      connectFailed: void function(error){}
      connected: void function(connection){}
      connectionLost: void function(error){}
      disconnected: void function(){}
      onerror: void function(error){}
      messageReceived: bool function(message){ return true}
      bindingError: function(error) {} 
      onUnauthorized: function(res) {} 
      reconnected: void function(connection){}
      reconnecting: function(retry) { return false; }
    */


    } catch (e) {
      console.log(`${this.exchangeName} Websocket:`, 'Start Failed', e)
    }
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.websocket.terminate()
    this.setLastDate('lastRestartedAt')
    this.start()
  }

  handleConnected (connection) {
    console.log(`${this.exchangeName} Websocket:`, 'Connected')

    // Subscribe to all market tickers
    // Note: the response does not return ALL markets, just the updated ones
    this.websocket.call('c2', 'SubscribeToSummaryDeltas').done((error, result) => {
      if (error) {
        return console.log(`${this.exchangeName} Websocket:`, 'Error', error)
      }
      if (result === true) {
        console.log(`${this.exchangeName} Websocket:`, 'Subscribed to SubscribeToSummaryDeltas')
      }
    })
  }

  handleMessage (message) {
    const data = jsonic(message.utf8Data)

    if (data.hasOwnProperty('M')) {
      if (data.M[0]) {
        if (data.M[0].hasOwnProperty('A')) {
          if (data.M[0].A[0]) {
            /**
             *  handling the GZip and base64 compression
             *  https://github.com/Bittrex/beta#response-handling
             */
            const b64 = data.M[0].A[0]
            const raw = new Buffer.from(b64, 'base64')

            zlib.inflateRaw(raw, (error, inflated) => {
              if (!error) {
                this.setLastDate('lastCheckedAt')

                // Finally, when we have unpacked it all, we can do something with the data
                if (inflated) {
                  const json = JSON.parse(inflated.toString('utf8')).D
                  const tickers = this.transformer.transformMultipleObjects(json)
                  this.setIncrementTotals('totalUpdates')
                  this.setLastDate('lastUpdateAt')
                  this.cacheTickers(tickers, this.exchangeName)
                  this.checkReloadMarkets() // Checks if market needs to be reloaded, if so, it will fetch the new markets from the API
                } else {
                  console.log(`${this.exchangeName} Websocket:`, 'Received a message but not data.')
                }
              }
            })
          }
        }
      }
    }
  }

  handleError (error) {
    console.log(`${this.exchangeName} Websocket:`, 'Error', error)
    this.restart()
  }

  handleConnectionLost (error) {
    console.log(`${this.exchangeName} Websocket:`, 'Connection Lost', error)
    this.restart()
  }

  handleConnectFailed (error) {
    console.log(`${this.exchangeName} Websocket:`, 'Connect Failed', error)
    this.restart()
  }

  handleDisconnected (connection) {
    console.log(`${this.exchangeName} Websocket:`, 'Disconnected', connection)
    this.restart()
  }
}

module.exports = Bittrex
