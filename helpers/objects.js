const convertObjectToKeyString = function (data) {
  // Input: {"ETH/BTC": {last:0.0001}}
  // Returns: {"ETH/BTC": "{\"last\":0.001}"}
  // Why? So we can properly convert JSON data to a format to be used with Redis HMSET
  return Object.entries(data).reduce((result, object) => {
    result[object[0]] = JSON.stringify(data[object[0]])
    return result
  }, {})
}

const convertKeyStringToObject = function (data) {
  // Input: {"ETH/BTC": "{\"last\":0.001}"}
  // Returns: {"ETH/BTC": "{\"last\":0.001}"}
  // Why? So we can properly convert results from Redis HMGETALL
  return Object.entries(data).reduce((result, object) => {
    result[object[0]] = JSON.parse(data[object[0]])
    return result
  }, {})
}

module.exports = {
  convertObjectToKeyString,
  convertKeyStringToObject
}
