/*
API Docs: https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md
*/
"use strict";
require('dotenv').config()
const Worker = require('./worker')
const socket = require('socket.io-client')('wss://streamer.cryptocompare.com')
const redis = require('../redis')
// const TransformBinance = require('../transformations/binance')
const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL);
const moment = require('moment')
const CCC = require('../helpers/ccc')

class Cryptocompare extends Worker {
  constructor () {
    super('Cryptocompare')
    this.websocketEndpoint = 'wss://streamer.cryptocompare.com'
    this.restartAfterHours = 12
  }

  handleWebsocketError (error) {
    this.handleSentryError(`${this.exchangeName} Worker: Websocket Error: ${error.message}`)
  }

  restart () {
    console.log(`${this.exchangeName} Websocket:`, 'Restarting...')
    this.websocket.terminate()
    this.setLastDate('lastRestartedAt')
    this.start()
  }

  start () {
    // socket.connect(this.websocketEndpoint)
    var currentPrice = {};
    var subscription = ['2~Binance~BTC~USDT', '2~Binance~ETH~USDT', '2~Bittrex~BTC~USDT'];
    socket.emit('SubAdd', { subs: subscription });
    socket.on("m", function(message) {
      var messageType = message.substring(0, message.indexOf("~"));
      var res = {};
      console.log(message)
      // if (messageType == CCC.STATIC.TYPE.CURRENTAGG) {
      if (messageType == CCC.STATIC.TYPE.CURRENT) {
        res = CCC.CURRENT.unpack(message);
        dataUnpack(res);
      }
    })

    var dataUnpack = function(data) {
      var from = data['FROMSYMBOL'];
      var to = data['TOSYMBOL'];
      var fsym = CCC.STATIC.CURRENCY.getSymbol(from);
      var tsym = CCC.STATIC.CURRENCY.getSymbol(to);
      var pair = from + to;
      // console.log(data);
  
      if (!currentPrice.hasOwnProperty(pair)) {
        currentPrice[pair] = {};
      }
  
      for (var key in data) {
        currentPrice[pair][key] = data[key];
      }
  
      if (currentPrice[pair]['LASTTRADEID']) {
        currentPrice[pair]['LASTTRADEID'] = parseInt(currentPrice[pair]['LASTTRADEID']).toFixed(0);
      }
      currentPrice[pair]['CHANGE24HOUR'] = CCC.convertValueToDisplay(tsym, (currentPrice[pair]['PRICE'] - currentPrice[pair]['OPEN24HOUR']));
      currentPrice[pair]['CHANGE24HOURPCT'] = ((currentPrice[pair]['PRICE'] - currentPrice[pair]['OPEN24HOUR']) / currentPrice[pair]['OPEN24HOUR'] * 100).toFixed(2) + "%";;
      displayData(currentPrice[pair], from, tsym, fsym);
    };
  
    var displayData = function(current, from, tsym, fsym) {
      console.log(current);
      var priceDirection = current.FLAGS;
      for (var key in current) {
        // console.log(current[key])
        if (key == 'CHANGE24HOURPCT') {
          // $('#' + key + '_' + from).text(' (' + current[key] + ')');
        }
        else if (key == 'LASTVOLUMETO' || key == 'VOLUME24HOURTO') {
          // $('#' + key + '_' + from).text(CCC.convertValueToDisplay(tsym, current[key]));
        }
        else if (key == 'LASTVOLUME' || key == 'VOLUME24HOUR' || key == 'OPEN24HOUR' || key == 'OPENHOUR' || key == 'HIGH24HOUR' || key == 'HIGHHOUR' || key == 'LOWHOUR' || key == 'LOW24HOUR') {
          // $('#' + key + '_' + from).text(CCC.convertValueToDisplay(fsym, current[key]));
        }
        else {
          // $('#' + key + '_' + from).text(current[key]);
        }
      }
  
      // $('#PRICE_' + from).removeClass();
      if (priceDirection & 1) {
        // $('#PRICE_' + from).addClass("up");
      }
      else if (priceDirection & 2) {
        // $('#PRICE_' + from).addClass("down");
      }
      if (current['PRICE'] > current['OPEN24HOUR']) {
        // $('#CHANGE24HOURPCT_' + from).removeClass();
        // $('#CHANGE24HOURPCT_' + from).addClass("up");
      }
      else if (current['PRICE'] < current['OPEN24HOUR']) {
        // $('#CHANGE24HOURPCT_' + from).removeClass();
        // $('#CHANGE24HOURPCT_' + from).addClass("down");
      }
    };
    // this.websocket = new WebSocket(this.websocketEndpoint)
    // this.websocket.addEventListener('error', this.handleWebsocketError.bind(this))

    // this.websocket.on('open', () => {
    //   console.log(`${this.exchangeName} Websocket:`, 'Opened Connection.')
    // })

    // this.websocket.on('message', (data) => {
    //   // TransformBinance.transformMultiple(data)
    //   console.log('message', data)
    //   this.totalUpdates = this.totalUpdates + 1
    //   this.lastUpdateAt = new Date()
    //   // this.cacheTickers(data, this.exchangeName)
    // })
  }
}

module.exports = Cryptocompare
