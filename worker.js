require('dotenv').config();
var Raven = require('raven');
Raven.config('https://386d9fe693df4a56b26b1a549d0372a0:f6d8e784e378493e8cf1556660b1cad6@sentry.io/711243').install();
var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');
var interval = require('interval-promise');
var axios = require('axios');
var ccxt = require('ccxt');
var md5 = require('md5');
var redis = require('./redis');
// var Binance = require('./workers/binance');
// var Bittrex = require('./workers/bittrex');

const Redis = require('ioredis')
const redisSub = new Redis(process.env.REDIS_URL)

// var binanceWorker = new Binance()
// binanceWorker.start()

// var bittrexWorker = new Bittrex()
// bittrexWorker.start()

class Worker extends SCWorker {
  run() {
    console.log('Socketcluster:', '   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    app.use(Raven.requestHandler());
    app.use(Raven.errorHandler());

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, 'public')));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    var count = 0;

    redisSub.subscribe('exchangeMarketsUpdate');

    redisSub.on('message', function (channel, message) {
      const exchangeName = message
      const event = channel

      if (event === 'exchangeMarketsUpdate') {
        getCachedData(`exchange:${exchangeName}:markets`, 'all')
        .then(result => {
          console.log('Socketcluster:', `Publish: markets--${exchangeName}`);
          scServer.exchange.publish(`markets--${exchangeName}`, {
            exchange: exchangeName,
            data: result
          });
        })
      }
    });

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (socket) {
      console.log('Socketcluster:', 'Client connection', socket.id)

      // Some sample logic to show how to handle client events,
      // replace this with your own logic

      // Send last market data on connection
      // getCachedExchangeData(socket, socket.id)

      socket.on('sampleClientEvent', function (data) {
        count++;
        console.log('Socketcluster:', 'Handled sampleClientEvent', data);
        scServer.exchange.publish('sample', count);
      });

      // Run a function 10 times with 1 second between each iteration


      var interval = setInterval(function () {
        socket.emit('rand', {
          rand: Math.floor(Math.random() * 5)
        });
      }, 1000);

      socket.on('disconnect', function () {
        console.log('Socketcluster:', 'Client disconnected')
        clearInterval(interval);
      });
    });
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
