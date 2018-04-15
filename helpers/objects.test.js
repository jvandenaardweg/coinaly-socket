const {convertToHMSETString, convertHMGETALLToJSON } = require('./objects')

describe('helpers/objects.js', () => {


  // beforeEach(async () => {
  //   binanceCCXT = new ccxt.binance()

  //   // Mock marketsById
  //   binanceCCXT.marketsById = mockMarketsById

  //   transformer = new BinanceTransformer(binanceCCXT)
  // })

  it('should transform an object to key { string }', () => {
    const input = {
      'ETH/BTC': {
        last: 0.003,
        high: 0.002,
        low: 0.001
      }
    }

    const expected = {"ETH/BTC": "{\"last\":0.003,\"high\":0.002,\"low\":0.001}"}
    expect(convertToHMSETString(input)).toMatchObject(expected)
  })

  it('should transform an object/string to key { object }', () => {
    const input = {"ETH/BTC": "{\"last\":0.003,\"high\":0.002,\"low\":0.001}"}
    const expected = {
      'ETH/BTC': {
        last: 0.003,
        high: 0.002,
        low: 0.001
      }
    }
    expect(convertHMGETALLToJSON(input)).toMatchObject(expected)
  })

})
