const ccxt = require('ccxt')

class BinanceTransformer {
  constructor(symbol) {
    // Load CCXT so we can use the build in methods to transform properties
    this.ccxt = new ccxt.binance({
      enableRateLimit: true
    })
  }

  transformMultipleObjects (input) {
    let objects
    // If the input is a string, convert it to JSON, so we have an Object to work with
    const json = (typeof input === 'string') ? JSON.parse(input) : input

    // Transform each given Object
    return json.map((object, index) => {
      return this.transformSingleObject(object)
    })[0]
  }

  transformSingleObject (input) {
    let output = {}
    let timestamp = this.ccxt.safeInteger (input, 'E')
    let iso8601 = (typeof timestamp === 'undefined') ? undefined : this.ccxt.iso8601 (input.E)

    // TODO: symbol / input.s > should be BASE/QUOTE
    output[input.s] = {
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
      'open': this.ccxt.safeFloat (input, 'o'),
      'close': this.ccxt.safeFloat (input, 'c'),
      'last': this.ccxt.safeFloat (input, 'c'),
      'previousClose': this.ccxt.safeFloat (input, 'x'),
      'change': this.ccxt.safeFloat (input, 'p'),
      'percentage': this.ccxt.safeFloat (input, 'P'),
      'average': undefined,
      'baseVolume': this.ccxt.safeFloat (input, 'v'),
      'quoteVolume': this.ccxt.safeFloat (input, 'q'),
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
