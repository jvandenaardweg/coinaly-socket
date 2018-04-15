const {convertObjectToKeyString, convertKeyStringToObject } = require('./objects')

describe('helpers/objects.js', () => {

  it('should transform an object to key { string }', () => {
    const input = {
      'ETH/BTC': {
        last: 0.003,
        high: 0.002,
        low: 0.001
      }
    }
    const expected = {"ETH/BTC": "{\"last\":0.003,\"high\":0.002,\"low\":0.001}"}
    expect(convertObjectToKeyString(input)).toMatchObject(expected)
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
    expect(convertKeyStringToObject(input)).toMatchObject(expected)
  })
})
