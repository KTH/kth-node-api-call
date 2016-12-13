// To keep backward compatibility
module.exports = require('./api')
module.exports = {
  Connections: require('./connections'),
  oidcApi: require('./oidcApi'),
  cachedApi: require('./cachedApi'),
  BasicAPI: require('./basic')
}
