const BinanceTransformer = require('./binance')

describe('transformers/binance.js', () => {

  let transformer

  beforeEach(() => {
    transformer = new BinanceTransformer()
  })

  it('should create a BinanceTransformer instance', () => {
    expect(transformer).toBeInstanceOf(BinanceTransformer)
  })

  it('should create proper output object when giving an input object', () => {
    expect(transformer.transformSingleObject(sampleInput)).toMatchObject({
    'BNBBTC': {
        'symbol': 'BNBBTC',
        'timestamp': 123456789,
        'datetime': '1970-01-02T10:17:36.789Z',
        'high': 0.0025,
        'low': 0.001,
        'bid': 0.0024,
        'bidVolume': 10,
        'ask': 0.0026,
        'askVolume': 100,
        'vwap': undefined,
        'open': 0.001,
        'close': 0.0025,
        'last': 0.0025,
        'previousClose': 0.0009,
        'change': 0.0015,
        'percentage': 250,
        'average': undefined,
        'baseVolume': 10000,
        'quoteVolume': 18,
        'info': sampleInput
      }
    })
  })

})




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
