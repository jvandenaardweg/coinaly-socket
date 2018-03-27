const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

redis.on('error', function (error) {
  console.log('Redis: Error: ', error)
})

redis.on('reconnecting', function () {
  console.log('Redis: Reconnecting...')
})

redis.on('close', function () {
  console.log('Redis: Connection closed.')
})

redis.on('ready', function () {
  console.log('Redis: Connection successful!')
  // console.log(redis.getBuiltinCommands())
})

module.exports = redis
