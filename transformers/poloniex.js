const ccxt = require('ccxt')

class PoloniexTransformer {
  constructor(ccxt) {
    this.ccxt = ccxt
  }

  transformMultipleObjects (input) {
    return input.reduce((result, object) => {
      result[this.getSymbolById(object[0])] = this.transformSingleObject(object)
      return result
    }, {})
  }

  getSymbolById (symbolId) {
    // Takes something like "ETHBTC", "ETH-BTC" (symbol naming the exchange uses in their API) and returns "ETH/BTC"
    return this.ccxt.marketsById[symbolId].symbol
  }

  getRelativeChange (ticker) {

  }

  transformSingleObject (input) {
    let output = {}
    const last = this.ccxt.safeFloat(input, 1)
    const percentage = input[4]
    let timestamp = this.ccxt.milliseconds()
    let relativeChange = parseFloat(percentage)
    if (relativeChange !== -1) {
      let open = last / this.ccxt.sum (1, relativeChange)
      let change = last - open
      let average = this.ccxt.sum(last, open) / 2
    }
    // See: https://github.com/Bittrex/beta/blob/master/README.md#appendix-a-minified-json-keys

    return {
      'symbol': this.getSymbolById(input[0]),
      'timestamp': timestamp,
      'datetime': this.ccxt.iso8601(timestamp),
      'high': this.ccxt.safeFloat(input, 8),
      'low': this.ccxt.safeFloat(input, 9),
      'bid': this.ccxt.safeFloat(input, 3),
      'bidVolume': undefined,
      'ask': this.ccxt.safeFloat(input, 2),
      'askVolume': undefined,
      'vwap': undefined,
      'open': undefined,
      'close': last,
      'last': last,
      'previousClose': undefined,
      'change': relativeChange,
      'percentage': relativeChange * 100,
      'average': undefined,
      'baseVolume': this.ccxt.safeFloat(input, 5),
      'quoteVolume': this.ccxt.safeFloat(input, 6),
      'info': input
    }

    return output
  }
}

/*

const sampleInput = [
  'USDT_ETC', // symbol 0
  '16.15000000', // last 1
  '16.21563646', // lowest ask 2
  '16.11578454', // highest bid 3
  '0.01974452', // percentage change 4
  '1107713.82036744', // base volume 5
  '69083.63851733', // quote volume 6
  0, // is frozen 7
  '16.39200000', // high 8
  '15.48198972' // low 9
]
*/


module.exports = PoloniexTransformer
