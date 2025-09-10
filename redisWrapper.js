const createRedisWrapper = async (apiName, redisDependency, config) => {
  if (isKthRedis4(redisDependency)) {
    const v4Client = await redisDependency.getClient(apiName, config)
    return createKthRedis4Wrapper(v4Client)
  }

  const defaultExportedClient = await redisDependency(apiName, config)
  if (isKthRedis3(redisDependency, defaultExportedClient)) {
    return createKthRedis3Wrapper(defaultExportedClient)
  }

  throw new Error(
    '@kth/api-call was configured with an unsupported Redis version. Only kth-node-redis 3 or 4 must be used.'
  )
}

const isKthRedis4 = redisDependency =>
  redisDependency?.version === 'kth-node-redis-4' && typeof redisDependency.getClient === 'function'

const isKthRedis3 = (redisDependency, client) =>
  typeof redisDependency.getClient === 'function' &&
  typeof client.set === 'function' &&
  typeof client.setAsync === 'function'

const createKthRedis4Wrapper = client => ({
  detectedVersion: 'kth-node-redis@4',
  set: async (key, value, callback) => {
    await client.set(key, value).catch(callback)
  },
  expire: async (key, ttl, callback) => {
    await client.expire(key, ttl).catch(callback)
  },
  get: async (key, callback) => {
    client
      .get(key)
      .then(value => {
        callback(undefined, value)
      })
      .catch(callback)
  },
})

const createKthRedis3Wrapper = client => ({
  detectedVersion: 'kth-node-redis@3',
  set: async (key, value, callback) => {
    return client.set(key, value, callback)
  },
  expire: async (key, ttl, callback) => {
    return client.expire(key, ttl, callback)
  },
  get: async (key, callback) => {
    return client.get(key, callback)
  },
})

module.exports = {
  createRedisWrapper,
}
