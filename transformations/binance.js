// 1. Data comes in
// 2. Object is transformed/normalized
// 3. New object is outputted
class TransformBinance {
  // constructor(symbol) {
  //   this.symbol = symbol
  // }

  transformMultiple (inputObject) {
    let outputObject = {}
    for (let i = 0; i < inputObject.length; i++) {
      outputObject['TEST'] = this.transformSingle(inputObject[i])
    }
    let outputObject = {}

    outputObject['2GIVE/BTC'] = {
      symbol: '2GIVE/BTC',
      timestamp: 1523099435030,
      datetime: '2018-04-07T11:10:35.030Z',
      high: 7.2e-7,
      low: 7.1e-7,
      bid: 7.1e-7,
      ask: 7.2e-7,
      close: 7.2e-7,
      last: 7.2e-7,
      change: 0,
      percentage: 0,
      baseVolume: 595035.2927886,
      quoteVolume: 0.42696483,
    }

    return outputObject
  }

  transformSingle (inputObject) {
    let outputObject = {}

    outputObject['2GIVE/BTC'] = {
      symbol: '2GIVE/BTC',
      timestamp: 1523099435030,
      datetime: '2018-04-07T11:10:35.030Z',
      high: 7.2e-7,
      low: 7.1e-7,
      bid: 7.1e-7,
      ask: 7.2e-7,
      close: 7.2e-7,
      last: 7.2e-7,
      change: 0,
      percentage: 0,
      baseVolume: 595035.2927886,
      quoteVolume: 0.42696483,
    }

    console.log('Transform single', outputObject)

    return outputObject
  }
}

/*
expected output per symbol:

"2GIVE/BTC": {
  "symbol": "2GIVE/BTC",
  "timestamp": 1523099435030,
  "datetime": "2018-04-07T11:10:35.030Z",
  "high": 7.2e-7,
  "low": 7.1e-7,
  "bid": 7.1e-7,
  "ask": 7.2e-7,
  "close": 7.2e-7,
  "last": 7.2e-7,
  "change": 0,
  "percentage": 0,
  "baseVolume": 595035.2927886,
  "quoteVolume": 0.42696483,
  "info": { }
}
*/

module.exports = new TransformBinance()
// export const transformBinance = new TransformBinance()
