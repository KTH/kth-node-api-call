const BasicAPI = require('./basic')

// default logger if none is provided in the opts object to _setup
const defaultLog = {}
defaultLog.error = defaultLog.info = defaultLog.debug = defaultLog.warn = console.log
const defaultTimeout = 30000

module.exports = {
  setup: _setup
}

// populate an object with all api configurations and paths
function _setup (apis, keys, opts) {
  if (!opts) opts = {}
  const endpoints = _createClients(apis, keys)
  const output = {}

  _getPaths(endpoints, opts)
  .then((results) => {
    results.forEach((endpoint) => {
      if (endpoint) {
        output[ endpoint.key ] = endpoint
      }
      
    })
    return output
  })
  .then(clients => {
    return configureApiCache(clients, opts)
  })
  .catch((err) => {
    throw err
  })
  return output
}

// check API key and kill if api is required
function _checkAPI (endpoint, log) {
  const config = endpoint.config
  const apiName = endpoint.key
  const uri = `${config.proxyBasePath}/_checkAPIkey` // get the proxyBasePath eg. api/publications
  endpoint.client.getAsync({uri: uri})
  .then(res => {
    if (res.statusCode === 401) {
      log.error('Bad API key for ' + apiName)
      if (config.required) {
        log.error('Required API misconfigured, EXITING')
        process.exit(1)
      }
    } else if (res.statusCode === 404) {
      log.error('Check API functionality not implemented on ' + apiName)
    } else if (res.statusCode === 500) {
      log.error('Got 500 response on checkAPI call, most likely a bad API key for ' + apiName)
    }
  })
}

// unpack nodeApi:s and pair with keys, returns BasicAPI objects
function _createClients (nodeApi, apiKey) {
  return Object.keys(nodeApi).map((key) => {
    const api = nodeApi[ key ]
    const opts = {
      hostname: api.host,
      port: api.port,
      https: api.https,
      headers: {
        'api_key': apiKey[ key ]
      },
      json: true,
      defaultTimeout: api.defaultTimeout
    }
    return {
      key: key,
      config: api,
      connected: false,
      client: new BasicAPI(opts)
    }
  })
}

// get connect to all configured api endpoints
function _getPaths (endpoints, opts) {
  if (!opts.log) opts.log = defaultLog
  if (!opts.timeout) opts.timeout = defaultTimeout
  const tasks = endpoints.map((api) => {              // for each endpoint
    return _connect(api, opts)
  })
  return Promise.all(tasks)
}

// connect to an api endpoint and get _paths
function _connect (api, opts) {
  const uri = `${api.config.proxyBasePath}/_paths` // get the proxyBasePath eg. api/publications
  return api.client.getAsync(uri)                   // return the api paths for the api
  .then((data) => {
    if (data.statusCode === 200) {
      api.paths = data.body.api
      api.connected = true
      opts.log.info('Connected to api: ' + api.key)
      if (opts.checkAPIs) {
        _checkAPI(api, opts.log || defaultLog)
      }
      return api
    } else {
      throw new Error(data.statusCode + ' We can\'t access this API server. Check path and keys')
    }
  })
  .catch((err) => {
    opts.log.error({ err: err }, 'Failed to get API paths from API: ', api.key, 'host: ', api.config.host, ' proxyBasePath: ', api.config.proxyBasePath)
    setTimeout(function () {
      opts.log.info('Reconnecting to api: ' + api.key)
      _connect(api, opts)
    }, opts.timeout)
    return api
  })
}

// configure caching if specified in opts object
function configureApiCache (clients, opts) {
  let log = defaultLog
  if (opts.log) log = opts.log

  Object.keys(clients).map(apiName => {
    if (_getRedisConfig(apiName, opts.cache)) {
      _getRedisClient(apiName, opts)
      .then(redisClient => {
        clients[ apiName ].client._hasRedis = true
        clients[ apiName ].client._redis = {
          prefix: apiName,
          client: redisClient,
          expire: _getRedisConfig(apiName, opts.cache).expireTime
        }
      })
      .catch(err => {
        log.error('Unable to create redisClient', {error: err})
        clients[ apiName ].client._hasRedis = false
      })
      log.debug(`API configured to use redis cache: ${apiName}`)
    }
  })

  return clients
}

/*
 * Check if there is a cache configured for this api
 */
function _getRedisConfig (apiName, cache) {
  if (cache && cache[ apiName ]) {
    return cache[ apiName ]
  }
  return undefined
}

/*
 * If configured to use nodeApi, i.e. api supporting KTH api standard and exposes a /_paths url
 * where the public URL is published.
 * Will download api specification from api and expose its methods internally under "/api" as paths objects
 */
function _getRedisClient (apiName, opts) {
  let cache = opts.cache ? opts.cache : {}
  let redis = opts.redis
  let log = opts.log || defaultLog
  try {
    if (cache[apiName]) {
      const cacheConfig = _getRedisConfig(apiName, cache)
      return redis(apiName, cacheConfig.redis)
    }
  } catch (err) {
    log.error('Error creating Redis client', err)
  }

  return Promise.reject(false)
}
