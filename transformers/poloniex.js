const ccxt = require('ccxt')

class PoloniexTransformer {
  constructor(ccxt) {
    this.ccxt = ccxt

    // Because poloniex returns ID numbers in the ticker, we need to know what symbol matches that id
    this.marketsMapping = this.ccxt.ids.reduce((prev, marketId) => {
      const id = this.ccxt.marketsById[marketId].info.id
      prev[id] = marketId
      return prev
    }, {})
  }

  getSymbolById (id) {
    const symbolId = this.marketsMapping[id]
    if (this.ccxt.marketsById[symbolId]) return this.ccxt.marketsById[symbolId].symbol
    return null
  }

  transformSingleObject (input) {
    let output = {}
    const last = this.ccxt.safeFloat(input, 1)
    const percentage = input[4]
    const symbol = this.getSymbolById(input[0])
    let timestamp = this.ccxt.milliseconds()
    let relativeChange = parseFloat(percentage)
    if (relativeChange !== -1) {
      let open = last / this.ccxt.sum (1, relativeChange)
      let change = last - open
      let average = this.ccxt.sum(last, open) / 2
    }

    output[symbol] = {
      'symbol': symbol,
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
  189,              // id
  '0.14499000',     // last
  '0.14498999',     // lowest ask
  '0.14476833',     // highest bid
  '-0.02828743',    // percentage change
  '201.12708881',   // base volume
  '1362.99989281',  // quote volume
  0,                // is frozen
  '0.14955007',     // high
  '0.14398806'      // low
]
*/


module.exports = PoloniexTransformer
