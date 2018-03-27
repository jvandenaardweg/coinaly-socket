require('dotenv').config();
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
var redis = require('./redis')

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
    app.use(serveStatic(path.resolve(__dirname, 'public')));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    var count = 0;

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (socket) {

      // Some sample logic to show how to handle client events,
      // replace this with your own logic

      // Send last market data on connection
      getCachedExchangeData(socket)

      socket.on('sampleClientEvent', function (data) {
        count++;
        console.log('Handled sampleClientEvent', data);
        scServer.exchange.publish('sample', count);
      });

      // Run a function 10 times with 1 second between each iteration
      getExchangeDataAtInterval(socket)

      var interval = setInterval(function () {
        socket.emit('rand', {
          rand: Math.floor(Math.random() * 5)
        });
      }, 1000);

      socket.on('disconnect', function () {
        clearInterval(interval);
      });
    });
  }
}

function getRedisCachedMarketData (exchangeName) {
  return redis.hget(`exchange:${exchangeName}:markets`, 'all')
  .then(result => JSON.parse(result))
}

function getCachedExchangeData (socket) {
  console.log('getCachedExchangeData')
  const bittrexCachedMarketData = getRedisCachedMarketData('bittrex')
  .then(json => {
    console.log('getCachedExchangeData', 'emit data from cache')
    socket.emit('exchangeData', {
      exchange: 'bittrex',
      data: json
    })
  })
}

function getExchangeDataAtInterval (socket) {
  interval(async () => {
    try {
      const result = await bittrexExchange.fetchTickers()
      emitExchangeData(result, socket, 'bittrex')
    } catch (e) {
      emitExchangeError('error', e, socket)
    }
  }, 2000)

  // interval(async () => {
  //   try {
  //     const result = await binanceExchange.fetchTickers()
  //     emitExchangeData(result, socket, 'binance')
  //   } catch (e) {
  //     emitExchangeError('error', e, socket)
  //   }
  // }, 2000)
}

var previousExchangeData = {}

function emitExchangeData (json, socket, exchangeName) {
  var stringifiedJson = JSON.stringify(json)
  if (previousExchangeData[exchangeName] !== md5(stringifiedJson)) {
    socket.emit('exchangeData', {
      exchange: exchangeName,
      data: json
    })
    previousExchangeData[exchangeName] = md5(stringifiedJson)
    redis.hset(`exchange:${exchangeName}:markets`, 'all', stringifiedJson)
    console.log('emitExchangeData', exchangeName, ' changed data', json['XVG/BTC'].last)
  } else {
    console.log('emitExchangeData', exchangeName, 'no change', json['XVG/BTC'].last)
  }
}

function emitExchangeError (type, error, socket) {
  handleExchangeError(ccxt, error)
  socket.emit('exchangeError', {
    data: type,
    error: error
  })
}


function handleExchangeError (ccxt, e) {
  let message
  let reason = null
  let exchangeErrorCode = null
  if (e instanceof ccxt.DDoSProtection || e.message.includes('ECONNRESET')) {
    // log.bright.yellow('[DDoS Protection] ' + e.message)
    message = e.message
    reason = 'ddos protection'
  } else if (e instanceof ccxt.RequestTimeout) {
    // log.bright.yellow('[Request Timeout] ' + e.message)
    message = e.message
    reason = 'request timeout'
  } else if (e instanceof ccxt.AuthenticationError) {
    // log.bright.yellow('[Authentication Error] ' + e.message)
    message = e.message
    reason = 'authentication error'
  } else if (e instanceof ccxt.ExchangeNotAvailable) {
    // log.bright.yellow('[Exchange Not Available Error] ' + e.message)
    message = e.message
    reason = 'exchange not available error'
  } else if (e instanceof ccxt.ExchangeError) {
    // log.bright.yellow('[Exchange Error] ' + e.message)
    message = e.message
    reason = 'exchange error'
  } else if (e instanceof ccxt.NetworkError) {
    // log.bright.yellow('[Network Error] ' + e.message)
    message = e.message
    reason = 'network error'
  } else {
    message = e.message
  }

  console.log(e)
}

new Worker();
