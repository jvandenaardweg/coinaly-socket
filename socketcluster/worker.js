// Source: https://github.com/SocketCluster/socketcluster/tree/master/sample

require('dotenv').config()
const Raven = require('raven')
Raven.config(process.env.SENTRY_DSN).install()
const redis = require('../redis')
const Redis = require('ioredis')
const redisSub = new Redis(process.env.REDIS_URL)
const util = require('util')
const { convertKeyStringToObject } = require('../helpers/objects')

var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

// function sendWorkerStatus (exchange, channel, socket) {
//   // Send the worker status
//   redis.hgetall(`workers:${exchange.toLowerCase()}:status`)
//   .then((result) => {
//     const data = convertKeyStringToObject(result);
//     socket.emit(channel, data);
//   })
// }

function getAvailableExchanges () {
  return redis.hgetall('exchanges')
  .then(data => convertKeyStringToObject(data))
  .then(data => {
    const activeExchangeNames = Object.keys(data).filter(exchangeName => data[exchangeName])

    // Subscribe to Redis publish events for each exchange
    // activeExchangeNames.forEach(exchangeName => {
    //   redisSub.psubscribe(`TICKERS~${exchangeName}*`)
    // })

    return activeExchangeNames
  })
}

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, '../public')));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    // Get the active/available exchanges from Redis
    getAvailableExchanges()
    .then(availableExchanges => {
      availableExchanges.forEach(exchangeName => {
        const exchangeNameUpperCased = exchangeName.toUpperCase()
        // Set Redis subscriptions
        redisSub.psubscribe(`TICKERS~${exchangeNameUpperCased}`) // Subscribes to global exchange changes, for example "TICKERS~BITTREX"
        redisSub.psubscribe(`TICKERS~${exchangeNameUpperCased}~*`) // Subscribes to specific ticker changes, for example "TICKERS~BITTREX~BTC/USDT"
      })

      redisSub.on('pmessage', function (pattern, channel, message) {
        // Publishing something like this:
        // Channel: TICKERS~BITTREX, TICKERS~BITTREX~BTC/USDT etc...
        // Data: {Objects}
        scServer.exchange.publish(channel, JSON.parse(message))
      })
    })

    scServer.on('connection', function (socket) {
      console.log('Socketcluster:', 'Client connection', `Socket ID: ${socket.id}`)

      // Get the available exchanges, so we can show that to the user
      getAvailableExchanges()
      .then(availableExchanges => {
        socket.emit('EXCHANGES~AVAILABLE', availableExchanges)
      })

      // On subscribe, send a cached response from Redis
      // So the user receives the first data immediately
      socket.on('subscribe', function (channel) {
        console.log('Socketcluster:', 'Client subscribe', channel, `Socket ID: ${socket.id}`)
        const channelSplitted = channel.split('~')
        const type = channelSplitted[0] // TICKERS
        const exchange = channelSplitted[1] // BITTREX, BINANCE, POLONIEX etc...
        const symbol = channelSplitted[2] // BTC/USDT, BTC/ETH etc...

        // Get all the cached tickers from an exchange
        if (!symbol) {
          // Get last cached tickers from Redis and send it to the user
          redis.hgetall(`exchanges:${exchange.toLowerCase()}:tickers`)
          .then(result => convertKeyStringToObject(result))
          .then(data => socket.emit(channel, data))
          .catch(handleRedisError)
        } else if (symbol) {
          redis.hget(`exchanges:${exchange.toLowerCase()}:tickers`, symbol)
          .then(result => socket.emit(channel, JSON.parse(result)))
          .catch(handleRedisError)
        } else {
          console.log('Not handled yet')
        }

      })

      socket.on('disconnect', function () {
        console.log('Socketcluster:', 'Client disconnected')
      })
    })
  }
}

function getCachedData (keyName, fieldName) {
  return redis.hget(keyName, fieldName)
  .then(result => JSON.parse(result))
  .catch(handleRedisError)
}

function handleRedisError(error) {
  console.log('Redis:', 'error', error)
}

new Worker();
