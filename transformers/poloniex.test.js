const PoloniexTransformer = require('./poloniex')
const ccxt = require('ccxt')

describe('transformers/poloniex.js', () => {

  let transformer
  let poloniexCCXT

  beforeEach(async () => {
    poloniexCCXT = new ccxt.poloniex()

    // Mock marketsById
    poloniexCCXT.marketsById = mockMarketsById

    transformer = new PoloniexTransformer(poloniexCCXT)
  })

  it('should create a PoloniexTransformer instance', () => {
    expect(transformer).toBeInstanceOf(PoloniexTransformer)
  })

  // it('should output a transformed object using the CCXT data model', () => {
  //   expect(transformer.transformSingleObject(sampleInput[0])).toMatchObject(expectedOutput['USDT/ETC'])
  // })

  // it('should ouput multiple objects when given multiple objects', () => {
  //   expect(transformer.transformMultipleObjects(sampleInput)).toMatchObject(expectedOutput)
  // })

})

const mockMarketsById = {
  'USDT_ETC': {
    symbol: 'USDT/ETC'
  },
  'USDT_XMR': {
    symbol: 'USDT/XMR'
  }
}

const sampleInput = [
  [
    'USDT_ETC', // symbol 0
    '16.15000000', // last 1
    '16.21563646', // lowest ask 2
    '16.11578454', // highest bid 3
    '0.01974452', // percentage change 4
    '1107713.82036744', // base volume 5
    '69083.63851733', // quote volume 6
    0, // is frozen 7
    '16.39200000', // high 8
    '15.48198972'
  ],
  [
    'USDT_XMR', // symbol 0
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
]

const expectedOutput = {
  "USDT/ETC": {
    "ask": 16.21563646,
    "askVolume": undefined,
    "average": undefined,
    "baseVolume": 1107713.82036744,
    "bid": 16.11578454,
    "bidVolume": undefined,
    "change": 0.01974452,
    "close": 16.15,
    "datetime": undefined,
    "high": 16.392,
    "info": ["USDT_ETC", "16.15000000", "16.21563646", "16.11578454", "0.01974452", "1107713.82036744", "69083.63851733", 0, "16.39200000", "15.48198972"],
    "last": 16.15,
    "low": 15.48198972,
    "open": undefined,
    "percentage": 1.974452,
    "previousClose": undefined,
    "quoteVolume": 69083.63851733,
    "symbol": "USDT/ETC",
    "timestamp": undefined,
    "vwap": undefined
  },
  "USDT/XMR": {
    "ask": 16.21563646,
    "askVolume": undefined,
    "average": undefined,
    "baseVolume": 1107713.82036744,
    "bid": 16.11578454,
    "bidVolume": undefined,
    "change": 0.01974452,
    "close": 16.15,
    "datetime": undefined,
    "high": 16.392,
    "info": ["USDT_XMR", "16.15000000", "16.21563646", "16.11578454", "0.01974452", "1107713.82036744", "69083.63851733", 0, "16.39200000", "15.48198972"],
    "last": 16.15,
    "low": 15.48198972,
    "open": undefined,
    "percentage": 1.974452,
    "previousClose": undefined,
    "quoteVolume": 69083.63851733,
    "symbol": "USDT/XMR",
    "timestamp": undefined,
    "vwap": undefined
  }
}
