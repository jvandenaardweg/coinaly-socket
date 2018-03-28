const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

redis.on('error', function (error) {
  console.log('Redis:', 'Error', error.code, error.message)
})

redis.on('reconnecting', function () {
  console.log('Redis:', 'Reconnecting...')
})

redis.on('close', function () {
  console.log('Redis:', 'Connection closed.')
})

redis.on('ready', function () {
  console.log('Redis:', 'Connect.')
})

redis.on('ready', function () {
  console.log('Redis:', 'Connection successful!')
})

redis.on('end', function () {
  console.log('Redis:', 'End.')
})

module.exports = redis
