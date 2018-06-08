const app = require('express')()
const server = require('http').createServer(app)
const serveStatic = require('serve-static')
const path = require('path')
const io = require('socket.io')(server)
const { convertKeyStringToObject } = require('./helpers/objects')

const redis = require('./redis')
const Redis = require('ioredis')
const redisSub = new Redis(process.env.REDIS_URL)

const port = process.env.PORT || 3000

// Used to display statistics how the server is doing
app.use('/monitor', serveStatic(path.resolve(__dirname, 'public')))

// Gets the available exchanges we watch for data
// This is set in Redis when starting the worker process
function getAvailableExchanges () {
  return redis.hgetall('exchanges')
  .then(data => convertKeyStringToObject(data))
  .then(data => {
    const activeExchangeNames = Object.keys(data).filter(exchangeName => data[exchangeName])
    return activeExchangeNames
  })
}

// When a client connects...
io.on('connection', function (client) {
  console.log('socket io connection', client.id)

  // Send available exchanges to the client
  getAvailableExchanges()
  .then(availableExchanges => {
    client.emit('message', {
      type: 'available-exchanges',
      data: availableExchanges
    })
  })

  // Watch for subscribe event
  client.on('subscribe', function (params) {
    const type = params.type.toUpperCase()
    const exchange = params.exchange.toUpperCase()
    const symbols = params.symbols

    // If we receive an array of symbols, the client wants to subscribe to multiple rooms
    if (Array.isArray(symbols)) {
      const rooms = symbols.reduce((prev, symbol) => {
        prev.push(`${type}~${exchange}~${symbol}`)
        return prev
      }, [])

      rooms.forEach(room => {
        const params = roomNameToParams(room)
        const typeParam = params[0]
        const exchangeParam = params[1]
        const symbolParam = params[2]

        // If we have a symbol, get that from cache
        // So the client can use this data as a starting point
        if (symbolParam) {
          redis.hget(`exchanges:${exchangeParam}:tickers`, symbolParam)
          .then(result => {
            return (typeof result === 'object') ? convertKeyStringToObject(result) : null
          })
          .then(ticker => {
            // console.log(ticker)
            // Send initial data to the client
            client.emit('message', {
              type: typeParam,
              exchange: exchangeParam,
              data: ticker
            })

            client.join(room)
            console.log('Websocket: Client joins room: ', room)
          })
        }
      })
    } else {
      // We did not receive a symbol, so we subscribe to all tickers for an exchange
      const room = `${type}~${exchange}`
      const params = roomNameToParams(room)
      const typeParam = params[0]
      const exchangeParam = params[1]

      // Send all cached tickers directly to the client
      // So the client can use this data as a starting point
      redis.hgetall(`exchanges:${exchangeParam}:tickers`)
      .then(result => {
        return (typeof result === 'object') ? convertKeyStringToObject(result) : null
      })
      .then(data => {
        // Send initial data to the client
        client.emit('message', {
          type: typeParam,
          exchange: exchangeParam,
          data: data
        })

        client.join(room)
        console.log('Websocket: Client joins room: ', room)
      })
    }
  })

  client.on('unsubscribe', function(id, msg){
    console.log('Websocket: Client unsubscribe:', id)
    client.leave(id)
  });

  client.on('event', function (data) {
    console.log('socket io event', data)
  })
  client.on('disconnect', function () {
    console.log('socket io disconnect', arguments)
  })
})

// Watch Redis pub/sub messages
getAvailableExchanges()
.then(availableExchanges => {
  availableExchanges.forEach(exchangeName => {
    const exchangeNameUpperCased = exchangeName.toUpperCase()
    // Set Redis subscriptions
    redisSub.psubscribe(`TICKERS~${exchangeNameUpperCased}`) // Subscribes to global exchange changes, for example "TICKERS~BITTREX"
    redisSub.psubscribe(`TICKERS~${exchangeNameUpperCased}~*`) // Subscribes to specific ticker changes, for example "TICKERS~BITTREX~BTC/USDT"
  })

  redisSub.on('pmessage', function (pattern, room, message) {
    // Publishing something like this:
    // Channel: TICKERS~BITTREX, TICKERS~BITTREX~BTC/USDT etc...
    // Data: {Objects}
    const params = roomNameToParams(room)

    io.to(room).emit('message', {
      type: params[0], // tickers
      exchange: params[1], // binance, bittrex, poloniex etc...
      symbol: (params[2]) ? params[2] : null, // BTC/USDT, BTC/ETH etc...
      data: JSON.parse(message)
    })
  })
})

function roomNameToParams (room) {
  return room.split('~').reduce((curr, data) => {
    let param = data
    if (!param.includes('/')) {
      param = param.toLowerCase()
    }
    curr.push(param)
    return curr
  }, [])
}
server.listen(port)
