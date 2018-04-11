require('dotenv').config()
const Raven = require('raven')
Raven.config(process.env.SENTRY_DSN).install()
const SCWorker = require('socketcluster/scworker')
const express = require('express')
const serveStatic = require('serve-static')
const path = require('path')
const morgan = require('morgan')
const healthChecker = require('sc-framework-health-check')
const interval = require('interval-promise')
const axios = require('axios')
const ccxt = require('ccxt')
const md5 = require('md5')
const redis = require('../redis')
const Redis = require('ioredis')
const redisSub = new Redis(process.env.REDIS_URL)

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
    app.use(serveStatic(path.resolve(__dirname, '../public')));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    var count = 0;

    redisSub.subscribe('exchangeTickersUpdate');

    redisSub.on('message', function (channel, message) {
      const exchangeName = message
      const event = channel

      if (event === 'exchangeTickersUpdate') {
        getCachedData(`exchange:${exchangeName}:tickers`, 'all')
        .then(result => {
          console.log('Socketcluster:', `Publish: tickers--${exchangeName}`);
          scServer.exchange.publish(`tickers--${exchangeName}`, {
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
