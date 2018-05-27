// Source: https://github.com/SocketCluster/socketcluster/tree/master/sample

require('dotenv').config()
const Raven = require('raven')
Raven.config(process.env.SENTRY_DSN).install()
const redis = require('../redis')
const Redis = require('ioredis')
const redisSub = new Redis(process.env.REDIS_URL)
const util = require('util')
const { convertKeyStringToObject } = require('../helpers/objects') 
const exchangesEnabled = require('../exchanges-enabled')


var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

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

    // Loop through the enabled exchanges to set the correct PubSub events to subscribe to
    Object.keys(exchangesEnabled).forEach((exchangeSlug, index) => {
      const eventName = exchangesEnabled[exchangeSlug].tickersEvent
      redisSub.psubscribe(`${eventName}*`)
    })

    redisSub.on('pmessage', function (pattern, channel, message) {
      // Publishing something like this:
      // Channel: TICKERS~BITTREX, TICKERS~BITTREX~BTC/USDT etc...
      // Data: {Objects}
      // console.log('Publishing to websocket:', channel)
      scServer.exchange.publish(channel, JSON.parse(message))
    })

    scServer.on('connection', function (socket) {
      console.log('Socketcluster:', 'Client connection', `Socket ID: ${socket.id}`)

      // Send the available exchanges and channels to the user
      socket.emit('EXCHANGES~AVAILABLE', Object.keys(exchangesEnabled))

      // On subscribe, send a cached response from Redis
      // So the user receives the first data immeadiatyly
      socket.on('subscribe', function (channel) {
        console.log('Socketcluster:', 'Client subscribe', channel, `Socket ID: ${socket.id}`)
        const channelSplitted = channel.split('~')
        const type = channelSplitted[0] // TICKERS?
        const exchange = channelSplitted[1] // BITTREX, BINANCE, POLONIEX etc...?
        const symbol = channelSplitted[2] // NEW, BTC/ETH etc...?

        sendWorkerStatus (exchange, channel, socket)

        if (!symbol) {
          // Get last cached tickers from Redis and send it to the user
          redis.hgetall(`exchanges:${exchange.toLowerCase()}:tickers`)
          .then((result) => {
            const data = convertKeyStringToObject(result);
            socket.emit(channel, data);
          })
          .catch(handleRedisError)
        } else if (symbol) {
          redis.hget(`exchanges:${exchange.toLowerCase()}:tickers`, symbol)
          .then((result) => {
            socket.emit(channel, JSON.parse(result));
          })
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
