const convertToHMSETString = function (data) {
  // Prepare the data for Redis HMSET
  // Returing a new Object like: "ETH/BTC": { string }
  // "ETH/BTC" will be the hash key
  return Object.entries(data).reduce((result, object) => {
    result[object[0]] = JSON.stringify(data[object[0]])
    return result
  }, {})
}

const convertHMGETALLToJSON = function (data) {
  // Converts HMGETALL data to JSON
  return Object.entries(data).reduce((result, object) => {
    result[object[0]] = JSON.parse(data[object[0]])
    return result
  }, {})
}

module.exports = {
  convertToHMSETString,
  convertHMGETALLToJSON
}
