const ccxt = require('ccxt')

class BittrexTransformer {
  constructor(ccxt) {
    this.ccxt = ccxt
  }

  transformMultipleObjects (input) {
    return input.reduce((result, object) => {
      if (this.getSymbolById(object.M)) result[this.getSymbolById(object.M)] = this.transformSingleObject(object)
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

  getPercentage (input) {
    const last = this.ccxt.safeFloat(input, 'l')
    const previous = this.ccxt.safeFloat(input, 'PD')
    return parseFloat(((this.getChange(input) / previous) * 100).toFixed(8))
  }

  getChange (input) {
    const last = this.ccxt.safeFloat(input, 'l')
    const previous = this.ccxt.safeFloat(input, 'PD')
    return parseFloat((last - previous).toFixed(8))
  }

  transformSingleObject (input) {
    let output = {}
    let timestamp = this.ccxt.safeInteger (input, 'T')
    let iso8601 = (typeof timestamp === 'undefined') ? undefined : this.ccxt.iso8601 (input.T)

    // See: https://github.com/Bittrex/beta/blob/master/README.md#appendix-a-minified-json-keys

    return {
      'symbol': this.getSymbolById(input.M),
      'timestamp': timestamp,
      'datetime': iso8601,
      'high': this.ccxt.safeFloat(input, 'H'),
      'low': this.ccxt.safeFloat(input, 'L'),
      'bid': this.ccxt.safeFloat(input, 'B'),
      'bidVolume': undefined,
      'ask': this.ccxt.safeFloat(input, 'A'),
      'askVolume': undefined,
      'vwap': undefined,
      'open': this.ccxt.safeFloat(input, 'o'),
      'close': this.ccxt.safeFloat(input, 'c'),
      'last': this.ccxt.safeFloat(input, 'l'),
      'previousClose': this.ccxt.safeFloat(input, 'PD'),
      'change': this.getChange(input),
      'percentage': this.getPercentage(input),
      'average': undefined,
      'baseVolume': this.ccxt.safeFloat(input, 'm'),
      'quoteVolume': this.ccxt.safeFloat(input, 'V'),
      'info': input
    }

    return output
  }
}

/*

const sampleInput = {
  M: 'BTC-AMP', // symbol
  H: 0.00003382, // high
  L: 0.00003003, // low
  V: 3454494.43257219, // volume (quote?)
  l: 0.00003172, // last
  m: 109.98346083, // base volume
  T: 1523629402130, // timestamp
  B: 0.00003156, // bid
  A: 0.00003172, // ask
  G: 393, // open buy orders
  g: 4183, // open sell orders
  PD: 0.00003138, // prevday
  x: 1446578035180 // created
}
  */


module.exports = BittrexTransformer
