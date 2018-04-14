const Worker = require('./worker')
const moment = require('moment')

// const redisMock = {
//   hget: function () {},
//   hset: function () {}
// }

describe('workers/worker.js', () => {

  let worker

  beforeEach(() => {
    worker = new Worker()
  })

  it('should create a Worker instance', () => {
    expect(worker).toBeInstanceOf(Worker)
  })

  it('should set the correct exchange naming', () => {
    expect(worker.exchangeName).toBe('Unknown')
    expect(worker.exchangeSlug).toBe('unknown')
    expect(worker.exchangeCapitalized).toBe('UNKNOWN')
  })

  it('should set the correct start date', () => {
    expect(worker.startedAt).toBeDefined()
  })

  it('should set the correct Redis cache keys', () => {
    expect(worker.cacheKey['tickers']).toBe('exchanges:unknown:tickers')
    expect(worker.cacheKey['markets']).toBe('exchanges:unknown:markets')
    expect(worker.cacheKey['status']).toBe('workers:unknown:status')
  })

  it('should set the correct running time', () => {
    worker.startedAt = moment('2018-01-01')
    expect(worker.runningTime()).toBeGreaterThan(8659528554) // 8659528554 is running time when writing this test (11-04-2018 07:26)
  })

  it('should set and return the correct last update date', () => {
    worker.setLastDate('lastUpdateAt')
    expect(moment(worker.lastUpdateAt).isValid()).toBe(true)
  })

  it('should set and return the correct last error date', () => {
    worker.setLastDate('lastErrorAt')
    expect(moment(worker.lastErrorAt).isValid()).toBe(true)
  })

  it('should set and return the correct last checked date', () => {
    worker.setLastDate('lastCheckedAt')
    expect(moment(worker.lastCheckedAt).isValid()).toBe(true)
  })

  it('should set and return the correct last reset date', () => {
    worker.setLastDate('lastResetAt')
    expect(moment(worker.lastResetAt).isValid()).toBe(true)
  })

  it('should set and return the correct last restart date', () => {
    worker.setLastDate('lastRestartedAt')
    expect(moment(worker.lastRestartedAt).isValid()).toBe(true)
  })

  it('should set and return the correct last reload date', () => {
    worker.setLastDate('lastReloadMarketsAt')
    expect(moment(worker.lastReloadMarketsAt).isValid()).toBe(true)
  })

  it('should return the correct restart now', () => {
    worker.startedAt = moment('2018-01-01')
    worker.restartAfterHours = 24
    expect(worker.shouldRestartNow()).toBe(true)

    worker.startedAt = moment()
    expect(worker.shouldRestartNow()).toBe(false)
  })

  it('should return the correct time to restart in minutes', () => {
    worker.restartAfterHours = 24
    expect(worker.timeToRestart()).toBe('1440 minutes')
  })

  it('should return the correct total updates', () => {
    worker.setIncrementTotals('totalUpdates')
    expect(worker.totalUpdates).toBe(1)

    worker.totalUpdates = 100
    worker.setIncrementTotals('totalUpdates')
    expect(worker.totalUpdates).toBe(101)
  })

  it('should return the correct total errors', () => {
    worker.setIncrementTotals('totalErrors')
    expect(worker.totalErrors).toBe(1)

    worker.totalErrors = 100
    worker.setIncrementTotals('totalErrors')
    expect(worker.totalErrors).toBe(101)
  })

  it('should return the correct total reload markets', () => {
    worker.setIncrementTotals('totalReloadsMarkets')
    expect(worker.totalReloadsMarkets).toBe(1)

    worker.totalReloadsMarkets = 100
    worker.setIncrementTotals('totalReloadsMarkets')
    expect(worker.totalReloadsMarkets).toBe(101)
  })

  it('should return the correct last update from now', () => {
    worker.lastUpdateAt = moment().subtract(1, 'hours')
    expect(worker.lastUpdateFromNow()).toBe('an hour ago')

    worker.lastUpdateAt = moment().subtract(1, 'minute')
    expect(worker.lastUpdateFromNow()).toBe('a minute ago')
  })

  it('should return the correct last reload markets from now', () => {
    worker.lastReloadMarketsAt = moment().subtract(1, 'hours')
    expect(worker.lastReloadMarketFromNow()).toBe('an hour ago')

    worker.lastReloadMarketsAt = moment().subtract(1, 'minute')
    expect(worker.lastReloadMarketFromNow()).toBe('a minute ago')
  })

  it('should return the correct reload markets now', () => {
    worker.lastReloadMarketsAt = moment('2018-01-01')
    worker.reloadMarketsAfterMinutes = 24
    expect(worker.shouldReloadMarketsNow()).toBe(true)

    worker.lastReloadMarketsAt = moment()
    expect(worker.shouldReloadMarketsNow()).toBe(false)
  })

  it('should return the correct time to reload markets in minutes', () => {
    worker.reloadMarketsAfterMinutes = 24
    expect(worker.timeToReloadMarkets()).toBe('24 minutes')

    worker.reloadMarketsAfterMinutes = false
    expect(worker.timeToReloadMarkets()).toBe(false)
  })

  // it('should throw an error when exchange is not supported', async () => {
  //   const TestExchange = new Worker('TestExchange')
  //   // TestExchange.createCCXTInstance()

  //   expect(TestExchange.createCCXTInstance()).toBe('Error hier')
  // })

  it('should convert object properties to a string for', () => {

    const input = {
      'ETH/BTC': {
        symbol: 'ETH/BTC',
        last: 0.004,
        high: 0.005,
        low: 0.001
      }
    }

    expect(typeof worker.convertToHMSETString(input)).toBe('object')
    expect(typeof worker.convertToHMSETString(input)['ETH/BTC']).toBe('string')
  })

  it('should convert JSON to a string', () => {
    const input = {
      'ETH/BTC': {
        symbol: 'ETH/BTC',
        last: 0.004,
        high: 0.005,
        low: 0.001
      }
    }
    expect(typeof worker.stringifyData(input)).toBe('string')
  })

  it('should return the correct object length', () => {
    const inputObject = {
      'ETH/BTC': {
        symbol: 'ETH/BTC',
        last: 0.004,
        high: 0.005,
        low: 0.001
      },
      'BTC/USDT': {
        symbol: 'BTC/USDT',
        last: 0.004,
        high: 0.005,
        low: 0.001
      }
    }

    const inputString = JSON.stringify(inputObject)

    expect(worker.getDataLength(inputObject)).toBe(2)
    expect(worker.getDataLength(inputString)).toBe(2)
  })

  it('should delete a CCXT instance', () => {
    worker = new Worker('Bittrex')
    expect(worker.deleteCCXTInstance()).toBe(null)
  })

})
