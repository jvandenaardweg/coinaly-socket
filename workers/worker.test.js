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
    worker = new Worker()
    expect(worker.exchangeName).toBe('Unknown')
    expect(worker.exchangeSlug).toBe('unknown')
  })

  it('should set the correct start date', () => {
    worker = new Worker()
    expect(worker.startedAt).toBeDefined()
  })

  it('should set the correct cache key', () => {
    worker = new Worker()
    expect(worker.cacheKey['tickers']).toBe('exchanges:unknown:tickers')
    expect(worker.cacheKey['markets']).toBe('exchanges:unknown:markets')
    expect(worker.cacheKey['status']).toBe('workers:unknown:status')
  })

  it('should set the correct running time', () => {
    worker = new Worker()
    worker.startedAt = moment('2018-01-01')
    expect(worker.runningTime()).toBeGreaterThan(8659528554) // 8659528554 is running time when writing this test (11-04-2018 07:26)
  })

  it('should set and return the correct last update time', () => {
    worker = new Worker()
    worker.setLastUpdateAt()
    expect(typeof worker.lastUpdateAt).toBe('object')
  })

  it('should return the correct restart now', () => {
    worker = new Worker()
    worker.startedAt = moment('2018-01-01')
    worker.restartAfterHours = 24
    expect(worker.shouldRestartNow()).toBe(true)

    worker.startedAt = moment()
    expect(worker.shouldRestartNow()).toBe(false)
  })

  it('should return the correct time to restart in minutes', () => {
    worker = new Worker()
    worker.restartAfterHours = 24
    expect(worker.timeToRestart()).toBe('1440 minutes')
  })

  it('should return the correct total updates', () => {
    worker = new Worker()
    worker.setTotalUpdates()
    expect(worker.totalUpdates).toBe(1)

    worker.totalUpdates = 100
    worker.setTotalUpdates()
    expect(worker.totalUpdates).toBe(101)
  })

  // it('should throw an error when exchange is not supported', () => {
  //   try {
  //     ExchangeWorkers['someweirdexchangename'] = new ExchangeWorker('someweirdexchangename')
  //   } catch (e) {
  //     expect(e.message).toBe('The exchange "someweirdexchangename" is currently not supported.')
  //   }
  // })

  // it('should create a CCXT instance upon creation', () => {
  //   expect(typeof ExchangeWorkers[].ccxt).toBe('object')
  // })

  // it('should create a CCXT instance without API credentials', () => {
  //   expect(ExchangeWorkers[].ccxt.apiKey).toBe(undefined)
  //   expect(ExchangeWorkers[].ccxt.secret).toBe(undefined)
  // })

  // it('should create a CCXT instance with rate limiting enabled', () => {
  //   expect(ExchangeWorkers[].ccxt.enableRateLimit).toBe(true)
  // })

  // it('should set the correct API credentials', () => {
  //   ExchangeWorkers[].setApiCredentials('test', 'test')
  //   expect(ExchangeWorkers[].ccxt.apiKey).toBe('test')
  //   expect(ExchangeWorkers[].ccxt.secret).toBe('test')
  // })

})
