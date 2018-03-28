/*
API Docs: https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md

*/
const WebSocket = require('ws')
const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')
const redis = require('../redis')
const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL);
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


ws.on('open', function open() {
  console.log('Biance Websocket:', 'Open')
})

ws.on('message', function incoming(data) {
  const parsedData = JSON.parse(data)
  const totalMarkets = parsedData.length
  // console.log('Binance Websocket:', 'Event Type', parsedData[0].e)
  redis.hset('exchange:binance:markets', 'all', data)
  console.log('Binance:', 'Redis', 'Saved Markets', totalMarkets)
  pub.publish('exchangeMarketsUpdate', 'binance');

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
})

module.exports = ws
