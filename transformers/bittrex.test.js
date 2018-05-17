const BittrexTransformer = require('./bittrex')
const ccxt = require('ccxt')

describe('transformers/bittrex.js', () => {

  let transformer
  let bittrexCCXT

  beforeEach(async () => {
    bittrexCCXT = new ccxt.bittrex()

    // Mock marketsById
    bittrexCCXT.marketsById = mockMarketsById

    transformer = new BittrexTransformer(bittrexCCXT)
  })

  it('should create a BittrexTransformer instance', () => {
    expect(transformer).toBeInstanceOf(BittrexTransformer)
  })

  it('should return the correct percentage', () => {
    const input = {
      l: 0.0012345,
      PD: 0.0013456
    }
    expect(transformer.getPercentage(input)).toBe(-8.25653983)
  })

  it('should return the correct change', () => {
    const input = {
      l: 0.0012345,
      PD: 0.0013456
    }
    expect(transformer.getChange(input)).toBe(-0.0001111)
  })

  it('should output a transformed object using the CCXT data model', () => {
    expect(transformer.transformSingleObject(sampleInput[0])).toMatchObject(expectedOutput['BTC/AMP'])
  })

  it('should ouput multiple objects when given multiple objects', () => {
    expect(transformer.transformMultipleObjects(sampleInput)).toMatchObject(expectedOutput)
  })

})

const mockMarketsById = {
  'BTC-AMP': {
    symbol: 'BTC/AMP'
  },
  'BTC-USDT': {
    symbol: 'BTC/USDT'
  }
}

const sampleInput = [
  {
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
  },
  {
    M: 'BTC-USDT', // symbol
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
]

const expectedOutput = {
  "BTC/AMP": {
    "ask": 0.00003172,
    "askVolume": undefined,
    "average": undefined,
    "baseVolume": 109.98346083,
    "bid": 0.00003156,
    "bidVolume": undefined,
    "change": 3.4e-7,
    "close": undefined,
    "datetime": "2018-04-13T14:23:22.130Z",
    "high": 0.00003382,
    "last": 0.00003172,
    "low": 0.00003003,
    "open": undefined,
    "percentage": 1.08349267,
    "previousClose": 0.00003138,
    "quoteVolume": 3454494.43257219,
    "symbol": "BTC/AMP",
    "timestamp": 1523629402130,
    "vwap": undefined
  },
  "BTC/USDT": {
    "ask": 0.00003172,
    "askVolume": undefined,
    "average": undefined,
    "baseVolume": 109.98346083,
    "bid": 0.00003156,
    "bidVolume": undefined,
    "change": 3.4e-7,
    "close": undefined,
    "datetime": "2018-04-13T14:23:22.130Z",
    "high": 0.00003382,
    "last": 0.00003172,
    "low": 0.00003003,
    "open": undefined,
    "percentage": 1.08349267,
    "previousClose": 0.00003138,
    "quoteVolume": 3454494.43257219,
    "symbol": "BTC/USDT",
    "timestamp": 1523629402130,
    "vwap": undefined
  }
}
