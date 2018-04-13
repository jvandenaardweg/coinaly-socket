const ccxt = require('ccxt')

class BinanceTransformer {
  constructor(ccxt) {
    this.ccxt = ccxt
  }

  transformMultipleObjects (input) {
    return input.reduce((result, object) => {
      result[this.getSymbolById(object.s)] = this.transformSingleObject(object)
      return result
    }, {})
  }

  getSymbolById (symbolId) {
    // Takes something like "ETHBTC", "ETH-BTC" (symbol naming the exchange uses in their API) and returns "ETH/BTC"
    return this.ccxt.marketsById[symbolId].symbol

    /*
    marketsById returns something like this (when loadMarkets is run before that)
    GRSBTC:
      { id: 'GRSBTC',
        symbol: 'GRS/BTC',
        base: 'GRS',
        quote: 'BTC',
        baseId: 'GRS',
        quoteId: 'BTC',
        info: [Object],
        lot: 1,
        active: true,
        precision: [Object],
        limits: [Object]
      }
    */
  }

  transformSingleObject (input) {
    let output = {}
    let timestamp = this.ccxt.safeInteger (input, 'E')
    let iso8601 = (typeof timestamp === 'undefined') ? undefined : this.ccxt.iso8601 (input.E)

    return {
      'symbol': this.getSymbolById(input.s),
      'timestamp': timestamp,
      'datetime': iso8601,
      'high': this.ccxt.safeFloat(input, 'h'),
      'low': this.ccxt.safeFloat(input, 'l'),
      'bid': this.ccxt.safeFloat(input, 'b'),
      'bidVolume': this.ccxt.safeFloat(input, 'B'),
      'ask': this.ccxt.safeFloat(input, 'a'),
      'askVolume': this.ccxt.safeFloat(input, 'A'),
      'vwap': undefined,
      'open': this.ccxt.safeFloat(input, 'o'),
      'close': this.ccxt.safeFloat(input, 'c'),
      'last': this.ccxt.safeFloat(input, 'c'),
      'previousClose': this.ccxt.safeFloat(input, 'x'),
      'change': this.ccxt.safeFloat(input, 'p'),
      'percentage': this.ccxt.safeFloat(input, 'P'),
      'average': undefined,
      'baseVolume': this.ccxt.safeFloat(input, 'v'),
      'quoteVolume': this.ccxt.safeFloat(input, 'q'),
      'info': input
    }

    return output
  }
}

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


module.exports = BinanceTransformer
