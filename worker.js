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


var bittrexExchange = new ccxt.bittrex({
  apiKey: process.env.BITTREX_API_KEY,
  secret: process.env.BITTREX_API_SECRET,
  timeout: 15000
})

var binanceExchange = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_API_SECRET,
  timeout: 15000
})

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

    getExchangeDataAtInterval(scServer)

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (socket) {
      console.log('Socketcluster:', 'Client connection', socket.id)

      // Some sample logic to show how to handle client events,
      // replace this with your own logic

      // Send last market data on connection
      getCachedExchangeData(socket)

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
  console.log('Redis:', 'Get cached data', keyName, fieldName)
  return redis.hget(keyName, fieldName)
  .then(result => JSON.parse(result))
  .catch(handleRedisError)
}

function handleRedisError(error) {
  console.log('Redis:', 'error', error)
}

function getCachedExchangeData (socket) {
  console.log('Socketcluster:', 'getCachedExchangeData')
  const bittrexCachedMarketData = getCachedData(`exchange:bittrex:markets`, 'all')
  .then(json => {
    console.log('Socketcluster:', 'getCachedExchangeData', 'emit data from cache')
    socket.emit('exchangeData', {
      exchange: 'bittrex',
      data: json
    })
  })
}

function getExchangeDataAtInterval (scServer, socketId) {
  interval(async () => {
    try {
      const result = await bittrexExchange.fetchTickers()
      emitExchangeData(result, scServer, 'bittrex', socketId)
    } catch (e) {
      emitExchangeError('error', e, scServer, 'bittrex')
    }
  }, 2000)

  // interval(async () => {
  //   try {
  //     const result = await binanceExchange.fetchTickers()
  //     emitExchangeData(result, socket, 'binance')
  //   } catch (e) {
  //     emitExchangeError('error', e, socket, 'binance')
  //   }
  // }, 2000)
}

var previousExchangeData = {}

function emitExchangeData (json, scServer, exchangeName, socketId) {
  var stringifiedJson = JSON.stringify(json)
  if (previousExchangeData[exchangeName] !== md5(stringifiedJson)) {
    scServer.exchange.publish('exchangeData--bittrex', {
      exchange: exchangeName,
      data: json
    });
    // socket.emit('exchangeData', {
    //   exchange: exchangeName,
    //   data: json
    // })
    previousExchangeData[exchangeName] = md5(stringifiedJson)
    redis.hset(`exchange:${exchangeName}:markets`, 'all', stringifiedJson)
    console.log('Socketcluster:', 'emitExchangeData', exchangeName, 'changed data')
  } else {
    console.log('Socketcluster:', 'emitExchangeData', exchangeName, 'no change')
  }
}

function emitExchangeError (type, error, scServer, exchangeName) {
  handleExchangeError(ccxt, error, scServer, exchangeName)
  scServer.exchange.publish('errors', {
    exchange: exchangeName,
    data: error
  });
}


function handleExchangeError (ccxt, e, socket, exchangeName) {
  let message
  let reason = null
  let exchangeErrorCode = null
  if (e instanceof ccxt.DDoSProtection || e.message.includes('ECONNRESET')) {
    // log.bright.yellow('[DDoS Protection] ' + e.message)
    message = e.message
    reason = 'ddos protection'
    console.log('CCXT:', 'Error', 'DDOS Protection')
  } else if (e instanceof ccxt.RequestTimeout) {
    // log.bright.yellow('[Request Timeout] ' + e.message)
    message = e.message
    reason = 'request timeout'
    console.log('CCXT:', 'Error', 'Request Timeout')
  } else if (e instanceof ccxt.AuthenticationError) {
    // log.bright.yellow('[Authentication Error] ' + e.message)
    message = e.message
    reason = 'authentication error'
    console.log('CCXT:', 'Error', 'Authenticfation Error')
  } else if (e instanceof ccxt.ExchangeNotAvailable) {
    // log.bright.yellow('[Exchange Not Available Error] ' + e.message)
    message = e.message
    reason = 'exchange not available error'
    console.log('CCXT:', 'Error', 'Exchange Not Available')
  } else if (e instanceof ccxt.ExchangeError) {
    // log.bright.yellow('[Exchange Error] ' + e.message)
    message = e.message
    reason = 'exchange error'
    console.log('CCXT:', 'Error', 'Exchange Error')
  } else if (e instanceof ccxt.NetworkError) {
    // log.bright.yellow('[Network Error] ' + e.message)
    message = e.message
    reason = 'network error'
    console.log('CCXT:', 'Error', 'Network Error')
  } else {
    message = e.message
  }

  console.log('CCXT:', 'Error', e.message)

  socket.emit('errors', {
    exchange: exchangeName,
    message: message,
    reason: reason
  })
}

new Worker();
