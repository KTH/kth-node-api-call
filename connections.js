'use strict'

const urlJoin = require('url-join')
const BasicAPI = require('./basic')

const NAME = '@kth/api-call'

// default logger if none is provided in the opts object to _setup
// eslint-disable-next-line no-console
const defaultLog = { error: console.log, info: console.log, debug: console.log, warn: console.log }
const defaultTimeout = 30000

// unpack nodeApi:s and pair with keys, returns BasicAPI objects
function createApis(apisConfig, apisKeyConfig, apiOpts) {
  return Object.keys(apisConfig).map(key => {
    const apiConfig = apisConfig[key]
    const opts = {
      hostname: apiConfig.host,
      port: apiConfig.port,
      https: apiConfig.https,
      json: true,
      defaultTimeout: apiConfig.defaultTimeout,
      headers: apiOpts.customHeaders || {},
      retryOnESOCKETTIMEDOUT: apiOpts.retryOnESOCKETTIMEDOUT,
      maxNumberOfRetries: apiOpts.maxNumberOfRetries,
      log: apiOpts.log || {},
    }

    if (apiConfig.useApiKey !== false) {
      const k = apisKeyConfig[key]
      if (!k) throw new Error(`${NAME} nodeApi ${key} has no api key set.`)

      opts.headers.api_key = apisKeyConfig[key]
    }

    const api = {
      key,
      config: apiConfig,
      connected: false,
      client: new BasicAPI(opts),
    }

    if (apiConfig.paths && typeof apiConfig.paths === 'object') {
      api.paths = apiConfig.paths
    }

    return api
  })
}

// get all api-paths from the /_paths endpoint
function connect(api, opts) {
  // Allow connecting to non node-api servers
  if (api.config.doNotCallPathsEndpoint) {
    return Promise.resolve({ ...api, connected: true })
  }

  const uri = `${api.config.proxyBasePath}/_paths` // get the proxyBasePath eg. api/publications
  return api.client
    .getAsync(uri) // return the api paths for the api
    .then(data => {
      if (data.statusCode === 200) {
        api.paths = data.body.api // eslint-disable-line no-param-reassign
        api.connected = true // eslint-disable-line no-param-reassign
        opts.log.info(`${NAME} Connected to api: ${api.key}`)
        return api
      }
      opts.log.warn(
        `${NAME} ${data.statusCode} We had problems accessing ${api.key} . Check path and keys if this issue persists. We will retry in ${opts.timeout}ms`
      )
      setTimeout(() => {
        opts.log.info(`${NAME} Reconnecting to api: ${api.key}`)
        connect(api, opts)
      }, opts.timeout)
      return api
    })
    .catch(err => {
      opts.log.error(
        { err },
        `${NAME} Failed to get API paths from API: ${api.key}, host: ${api.config.host}, proxyBasePath:  ${api.config.proxyBasePath}.`
      )
      setTimeout(() => {
        opts.log.info(`${NAME} Reconnecting to api: ${api.key}`)
        connect(api, opts)
      }, opts.timeout)
      return api
    })
}

// retrieve paths from remote /_paths endpoint
function getPathsRemote(apis, opts) {
  const connectedApiPromises = apis.map(api => connect(api, opts))
  return connectedApiPromises
}

// check API key and kill if api is required
function checkAPI(api, log) {
  const { config } = api
  const apiName = api.key

  const statusCheckPath = api.config.statusCheckPath || '_checkAPIkey'
  const uri = urlJoin(config.proxyBasePath, statusCheckPath)
  api.client
    .getAsync({ uri })
    .then(res => {
      if (config.useApiKey !== false) {
        if (res.statusCode === 401) {
          throw new Error(`${NAME} Bad API key for ${apiName}`)
        } else if (res.statusCode === 404) {
          throw new Error(`${NAME} Check API functionality not implemented on ${apiName}`)
        } else if (res.statusCode === 500) {
          throw new Error(`${NAME} Got 500 response on checkAPI call, most likely a bad API key for  ${apiName}`)
        }
      } else if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`${NAME} API check failed for ${apiName}, got status ${res.statusCode}`)
      }
    })
    .catch(err => {
      log.error(`${NAME} Error while checking API: ${err.message}`)
      if (config.required) {
        log.error(`${NAME} Required API call failed, EXITING`)
        process.exit(1)
      }
    })
}

/*
 * Check if there is a cache configured for this api
 */
function getRedisConfig(apiName, cache) {
  if (cache && cache[apiName]) {
    return cache[apiName]
  }
  return undefined
}

/*
 * If configured to use nodeApi, i.e. api supporting KTH api standard and exposes a /_paths url
 * where the public URL is published.
 * Will download api specification from api and expose its methods internally under "/api" as paths objects
 */
function getRedisClient(apiName, opts) {
  return new Promise((resolve, reject) => {
    const cache = opts.cache ? opts.cache : {}
    const { redis } = opts
    try {
      if (cache[apiName]) {
        const cacheConfig = getRedisConfig(apiName, cache)
        resolve(() => redis(apiName, cacheConfig.redis))
      }
    } catch (err) {
      opts.log.error('Error creating Redis client', err)
      reject(err)
    }
  })
}

// configure caching if specified in opts object
function configureApiCache(connectedApi, opts) {
  const apiName = connectedApi.key
  if (getRedisConfig(apiName, opts.cache)) {
    getRedisClient(apiName, opts)
      .then(getRedisClientFnc => {
        connectedApi.client._hasRedis = true // eslint-disable-line no-param-reassign
        // eslint-disable-next-line no-param-reassign
        connectedApi.client._redis = {
          prefix: apiName,
          client: getRedisClientFnc,
          expire: getRedisConfig(apiName, opts.cache).expireTime,
        }
      })
      .catch(err => {
        opts.log.error('Unable to create redisClient', { error: err })
        connectedApi.client._hasRedis = false // eslint-disable-line no-param-reassign
      })
    opts.log.debug(`API configured to use redis cache: ${apiName}`)
  }
  return connectedApi
}

// populate an object with all api configurations and paths
function setup(apisConfig, apisKeyConfig, opts) {
  if (!apisConfig || typeof apisConfig !== 'object') {
    throw new Error(`${NAME} Apis config is required.`)
  }
  const myApisKeyConfig = { ...apisKeyConfig }
  const myOpts = { log: defaultLog, timeout: defaultTimeout, ...opts }
  const output = {}

  const apis = createApis(apisConfig, myApisKeyConfig, myOpts)

  const connectedApis = apis.filter(api => api.paths).map(api => Promise.resolve({ ...api, connected: true }))

  const apisWithoutPaths = apis.filter(api => !api.paths)
  const remoteConnectedApis = getPathsRemote(apisWithoutPaths, myOpts)

  const allConnectedApis = Promise.all(remoteConnectedApis.concat(connectedApis))

  allConnectedApis
    .then(connApis => {
      connApis.forEach(connApi => {
        if (connApi) {
          if (myOpts.checkAPIs) {
            checkAPI(connApi, myOpts.log)
          }
          const configuredApi = configureApiCache(connApi, myOpts)
          output[connApi.key] = configuredApi
        }
      })
      myOpts.log.info(`${NAME} API setup done. ${JSON.stringify(connApis)}`)
    })
    .catch(err => {
      myOpts.log.error(`${NAME} API setup failed: ${err.stack} `)
      process.exit(1)
    })

  return output
}

module.exports = {
  setup,
}
