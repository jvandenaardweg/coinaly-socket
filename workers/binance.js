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

class Binance extends Worker {
  constructor () {
    super('Binance')
    this.websocketEndpoint = 'wss://stream.binance.com:9443/ws/!ticker@arr'
    this.restartAfterHours = 12 // Binance API docs state a Websocket connection gets disconnected after 24 hours. We just restart it way before that.
    this.transformer = new BinanceTransformer()
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

  start () {
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
    })
  }
}

module.exports = Binance


/*
      {
        "e": "24hrTicker",  // Event type
        "E": 123456789,     // Event time
        "s": "BNBBTC",      // Symbol
        "p": "0.0015",      // Price change
        "P": "250.00",      // Price change percent
        "w": "0.0018",      // Weighted average price
        "x": "0.0009",      // Previous day's close price
        "c": "0.0025",      // Current day's close price
        "Q": "10",          // Close trade's quantity
        "b": "0.0024",      // Best bid price
        "B": "10",          // Bid bid quantity
        "a": "0.0026",      // Best ask price
        "A": "100",         // Best ask quantity
        "o": "0.0010",      // Open price
        "h": "0.0025",      // High price
        "l": "0.0010",      // Low price
        "v": "10000",       // Total traded base asset volume
        "q": "18",          // Total traded quote asset volume
        "O": 0,             // Statistics open time
        "C": 86400000,      // Statistics close time
        "F": 0,             // First trade ID
        "L": 18150,         // Last trade Id
        "n": 18151          // Total number of trades
      }
      */




// const Joi = require('joi');

// const schema = Joi.object().keys({
//   e: Joi.string(),
//   E: Joi.number(),
//   s: Joi.string(),
//   p: Joi.string()
//     username: Joi.string().alphanum().min(3).max(30).required(),
//     password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
//     access_token: [Joi.string(), Joi.number()],
//     birthyear: Joi.number().integer().min(1900).max(2013),
//     email: Joi.string().email()
// }).with('username', 'birthyear').without('password', 'access_token');

// // Return result.
// const result = Joi.validate({ username: 'abc', birthyear: 1994 }, schema);
// // result.error === null -> valid

// // You can also pass a callback which will be called synchronously with the validation result.
// Joi.validate({ username: 'abc', birthyear: 1994 }, schema, function (err, value) { });




// module.exports = ws
