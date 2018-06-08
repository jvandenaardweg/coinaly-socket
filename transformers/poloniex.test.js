const PoloniexTransformer = require('./poloniex')
const ccxt = require('ccxt')

describe('transformers/poloniex.js', () => {

  let transformer
  let poloniexCCXT

  beforeEach(async () => {
    poloniexCCXT = new ccxt.poloniex()

    // Mock marketsById
    poloniexCCXT.marketsById = mockMarketsById
    poloniexCCXT.ids = mockIds

    transformer = new PoloniexTransformer(poloniexCCXT)
  })

  it('should create a PoloniexTransformer instance', () => {
    expect(transformer).toBeInstanceOf(PoloniexTransformer)
  })

  it('should output a transformed object using the CCXT data model', () => {
    const transformed = transformer.transformSingleObject(sampleInput)
    const timestamp = poloniexCCXT.milliseconds()
    const datetime = poloniexCCXT.iso8601(timestamp)

    const expectedOutput = {
      "BTC/USDT": {
        "ask": 0.14498999,
        "askVolume": undefined,
        "average": undefined,
        "baseVolume": 201.12708881,
        "bid": 0.14476833,
        "bidVolume": undefined,
        "change": -0.02828743,
        "close": 0.14499000,
        "datetime": datetime,
        "high": 0.14955007,
        "info": sampleInput,
        "last": 0.14499000,
        "low": 0.14398806,
        "open": undefined,
        "percentage": -2.828743,
        "previousClose": undefined,
        "quoteVolume": 1362.99989281,
        "symbol": "BTC/USDT",
        "timestamp": timestamp,
        "vwap": undefined
      }
    }

    expect(transformed).toMatchObject(expectedOutput)
  })

})

const mockMarketsById = {
  'BTC_USDT': {
    symbol: 'BTC/USDT',
    info: {
      id: 1
    }
  },
  'XRP_BTC': {
    symbol: 'XRP/BTC',
    info: {
      id: 2
    }
  }
}

const mockIds = ['BTC_USDT', 'XRP_BTC']


const sampleInput = [
  1,              // id
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


