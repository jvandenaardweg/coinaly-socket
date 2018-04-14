const BinanceTransformer = require('./binance')
const ccxt = require('ccxt')

describe('transformers/binance.js', () => {

  let transformer
  let binanceCCXT

  beforeEach(async () => {
    binanceCCXT = new ccxt.binance()

    // Mock marketsById
    binanceCCXT.marketsById = mockMarketsById

    transformer = new BinanceTransformer(binanceCCXT)
  })

  it('should create a BinanceTransformer instance', () => {
    expect(transformer).toBeInstanceOf(BinanceTransformer)
  })

  it('should output a transformed object using the CCXT data model', () => {
    expect(transformer.transformSingleObject(sampleInput[0])).toMatchObject(expectedOutput['BNB/BTC'])
  })

  it('should ouput multiple objects when given multiple objects', () => {
    expect(transformer.transformMultipleObjects(sampleInput)).toMatchObject(expectedOutput)
  })

})

const mockMarketsById = {
  'BNBBTC': {
    symbol: 'BNB/BTC'
  },
  'ETHBTC': {
    symbol: 'ETH/BTC'
  }
}

const sampleInput = [
  {
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
  },
  {
    "e": "24hrTicker",  // Event type
    "E": 123456789,     // Event time
    "s": "ETHBTC",      // Symbol
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
]

const expectedOutput = {
  "BNB/BTC": {
    "ask": 0.0026,
    "askVolume": 100,
    "average": undefined,
    "baseVolume": 10000,
    "bid": 0.0024,
    "bidVolume": 10,
    "change": 0.0015,
    "close": 0.0025,
    "datetime": "1970-01-02T10:17:36.789Z",
    "high": 0.0025,
    "info": {
        "A": "100",
        "B": "10",
        "C": 86400000,
        "E": 123456789,
        "F": 0,
        "L": 18150,
        "O": 0,
        "P": "250.00",
        "Q": "10",
        "a": "0.0026",
        "b": "0.0024",
        "c": "0.0025",
        "e": "24hrTicker",
        "h": "0.0025",
        "l": "0.0010",
        "n": 18151,
        "o": "0.0010",
        "p": "0.0015",
        "q": "18",
        "s": "BNBBTC",
        "v": "10000",
        "w": "0.0018",
        "x": "0.0009"
    },
    "last": 0.0025,
    "low": 0.001,
    "open": 0.001,
    "percentage": 250,
    "previousClose": 0.0009,
    "quoteVolume": 18,
    "symbol": "BNB/BTC",
    "timestamp": 123456789,
    "vwap": undefined
  },
  "ETH/BTC": {
    "ask": 0.0026,
    "askVolume": 100,
    "average": undefined,
    "baseVolume": 10000,
    "bid": 0.0024,
    "bidVolume": 10,
    "change": 0.0015,
    "close": 0.0025,
    "datetime": "1970-01-02T10:17:36.789Z",
    "high": 0.0025,
    "info": {
        "A": "100",
        "B": "10",
        "C": 86400000,
        "E": 123456789,
        "F": 0,
        "L": 18150,
        "O": 0,
        "P": "250.00",
        "Q": "10",
        "a": "0.0026",
        "b": "0.0024",
        "c": "0.0025",
        "e": "24hrTicker",
        "h": "0.0025",
        "l": "0.0010",
        "n": 18151,
        "o": "0.0010",
        "p": "0.0015",
        "q": "18",
        "s": "ETHBTC",
        "v": "10000",
        "w": "0.0018",
        "x": "0.0009"
    },
    "last": 0.0025,
    "low": 0.001,
    "open": 0.001,
    "percentage": 250,
    "previousClose": 0.0009,
    "quoteVolume": 18,
    "symbol": "ETH/BTC",
    "timestamp": 123456789,
    "vwap": undefined
  }
}
