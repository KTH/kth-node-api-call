'use strict'

const BasicAPI = require('./basic')
const urlJoin = require('url-join')

// default logger if none is provided in the opts object to _setup
const defaultLog = {}
defaultLog.error = defaultLog.info = defaultLog.debug = defaultLog.warn = console.log
const defaultTimeout = 30000

module.exports = {
  setup
}

// populate an object with all api configurations and paths
function setup (apisConfig, apisKeyConfig, opts) {
  if (!apisConfig || typeof apisConfig !== 'object') {
    throw new Error('Apis config is required.')
  }
  if (!apisKeyConfig) apisKeyConfig = {}
  if (!opts) opts = {}
  if (!opts.log) opts.log = defaultLog
  if (!opts.timeout) opts.timeout = defaultTimeout
  const output = {}

  const apis = createApis(apisConfig, apisKeyConfig, opts)

  const connectedApis = apis
    .filter(api => api.paths)
    .map(api => {
      api.connected = true
      return Promise.resolve(api)
    })

  const apisWithoutPaths = apis.filter(api => !api.paths)
  const remoteConnectedApis = getPathsRemote(apisWithoutPaths, opts)

  const allConnectedApis = Promise.all(remoteConnectedApis.concat(connectedApis))

  allConnectedApis
    .then((connectedApis) => {
      connectedApis.forEach((connectedApi) => {
        if (connectedApi) {
          if (opts.checkAPIs) {
            checkAPI(connectedApi, opts.log)
          }
          configureApiCache(connectedApi, opts)
          output[ connectedApi.key ] = connectedApi
        }
      })
      opts.log.info('API setup done.' + JSON.stringify(connectedApis))
    })
    .catch(err => {
      opts.log.error(`API setup failed: ${err.stack} `)
      process.exit(1)
    })

  return output
}

// check API key and kill if api is required
function checkAPI (api, log) {
  const config = api.config
  const apiName = api.key

  const statusCheckPath = api.config.statusCheckPath || '_checkAPIkey'
  const uri = urlJoin(config.proxyBasePath, statusCheckPath)
  api.client.getAsync({uri})
    .then(res => {
      if (config.useApiKey !== false) {
        if (res.statusCode === 401) {
          throw new Error(`Bad API key for ${apiName}`)
        } else if (res.statusCode === 404) {
          throw new Error(`Check API functionality not implemented on ${apiName}`)
        } else if (res.statusCode === 500) {
          throw new Error(`Got 500 response on checkAPI call, most likely a bad API key for  ${apiName}`)
        }
      } else {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          throw new Error(`API check failed for ${apiName}, got status ${res.statusCode}`)
        }
      }
    })
    .catch(err => {
      log.error(`Error while checking API: ${err.message}`)
      if (config.required) {
        log.error('Required API call failed, EXITING')
        process.exit(1)
      }
    })
}

// unpack nodeApi:s and pair with keys, returns BasicAPI objects
function createApis (apisConfig, apisKeyConfig, apiOpts) {
  return Object.keys(apisConfig).map((key) => {
    const apiConfig = apisConfig[ key ]
    const opts = {
      hostname: apiConfig.host,
      port: apiConfig.port,
      https: apiConfig.https,
      json: true,
      defaultTimeout: apiConfig.defaultTimeout,
      headers: apiOpts.customHeaders || {}
    }

    if (apiConfig.useApiKey !== false) {
      const k = apisKeyConfig[ key ]
      if (!k) throw new Error(`nodeApi ${key} has no api key set.`)

      opts.headers['api_key'] = apisKeyConfig[key]
    }

    const api = {
      key: key,
      config: apiConfig,
      connected: false,
      client: new BasicAPI(opts)
    }

    if (apiConfig.paths && typeof apiConfig.paths === 'object') {
      api.paths = apiConfig.paths
    }

    return api
  })
}

// retrieve paths from remote /_paths endpoint
function getPathsRemote (apis, opts) {
  const connectedApiPromises = apis.map((api) => {
    return connect(api, opts)
  })
  return connectedApiPromises
}

// get all api-paths from the /_paths endpoint
function connect (api, opts) {
  // Allow connecting to non node-api servers
  if (api.config.doNotCallPathsEndpoint) {
    api.connected = true
    return Promise.resolve(api)
  }

  const uri = `${api.config.proxyBasePath}/_paths` // get the proxyBasePath eg. api/publications
  return api.client.getAsync(uri)                   // return the api paths for the api
    .then((data) => {
      if (data.statusCode === 200) {
        api.paths = data.body.api
        api.connected = true
        opts.log.info('Connected to api: ' + api.key)
        return api
      } else {
        throw new Error(data.statusCode + ' We can\'t access this API server. Check path and keys')
      }
    })
    .catch((err) => {
      opts.log.error({ err: err }, 'Failed to get API paths from API: ', api.key, 'host: ', api.config.host, ' proxyBasePath: ', api.config.proxyBasePath)
      setTimeout(function () {
        opts.log.info('Reconnecting to api: ' + api.key)
        connect(api, opts)
      }, opts.timeout)
      return api
    })
}

// configure caching if specified in opts object
function configureApiCache (connectedApi, opts) {
  const apiName = connectedApi.key
  if (getRedisConfig(apiName, opts.cache)) {
    getRedisClient(apiName, opts)
    .then(redisClient => {
      connectedApi.client._hasRedis = true
      connectedApi.client._redis = {
        prefix: apiName,
        client: redisClient,
        expire: getRedisConfig(apiName, opts.cache).expireTime
      }
    })
    .catch(err => {
      opts.log.error('Unable to create redisClient', {error: err})
      connectedApi.client._hasRedis = false
    })
    opts.log.debug(`API configured to use redis cache: ${apiName}`)
  }
  return connectedApi
}

/*
 * Check if there is a cache configured for this api
 */
function getRedisConfig (apiName, cache) {
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
function getRedisClient (apiName, opts) {
  let cache = opts.cache ? opts.cache : {}
  let redis = opts.redis
  try {
    if (cache[apiName]) {
      const cacheConfig = getRedisConfig(apiName, cache)
      return redis(apiName, cacheConfig.redis)
    }
  } catch (err) {
    opts.log.error('Error creating Redis client', err)
  }

  return false
}
