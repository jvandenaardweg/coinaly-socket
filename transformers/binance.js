const ccxt = require('ccxt')

class BinanceTransformer {
  constructor(symbol) {
    this.ccxt = new ccxt.binance({
      enableRateLimit: true
    });

    // this.loadMarkets()
  }

  // async loadMarkets () {
  //   console.log('Load Binance Markets for Transformer')
  //   await this.ccxt.loadMarkets()
  // }

  transformObject (input) {
    let timestamp = this.ccxt.safeInteger (input, 'E');
    let iso8601 = (typeof timestamp === 'undefined') ? undefined : this.ccxt.iso8601 (input.E);
    // let symbol = this.ccxt.findSymbol (this.ccxt.safeString (input, 'symbol'), market);
    // let last = this.ccxt.safeFloat (input, 'lastPrice');

    /*
    const sampleInput = {
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

    const output = {
      'symbol': input.s,
      'timestamp': timestamp,
      'datetime': iso8601,
      'high': this.ccxt.safeFloat (input, 'h'),
      'low': this.ccxt.safeFloat (input, 'l'),
      'bid': this.ccxt.safeFloat (input, 'b'),
      'bidVolume': this.ccxt.safeFloat (input, 'B'),
      'ask': this.ccxt.safeFloat (input, 'a'),
      'askVolume': this.ccxt.safeFloat (input, 'A'),
      'vwap': undefined,
      // 'vwap': this.ccxt.safeFloat (input, 'weightedAvgPrice'),
      'open': this.ccxt.safeFloat (input, 'o'),
      'close': this.ccxt.safeFloat (input, 'c'),
      'last': this.ccxt.safeFloat (input, 'c'),
      'previousClose': this.ccxt.safeFloat (input, 'x'), // previous day close
      'change': this.ccxt.safeFloat (input, 'p'),
      'percentage': this.ccxt.safeFloat (input, 'P'),
      'average': undefined,
      // 'average': undefined,
      'baseVolume': this.ccxt.safeFloat (input, 'v'),
      'quoteVolume': this.ccxt.safeFloat (input, 'q'),
      // 'info': input
    }

    return output
  }
}


module.exports = BinanceTransformer
