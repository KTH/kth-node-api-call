const createRedisWrapper = async (apiName, redisDependency, config) => {
  const client = await redisDependency(apiName, config)

  if (isKthRedis3(redisDependency, client)) {
    return createKthRedis3Wrapper(client)
  }
  throw new Error('@kth/api-call was configured with an unsupported Redis version. Only kth-node-redis@3 must be used.')
}

const isKthRedis3 = (redisDependency, client) =>
  typeof redisDependency.getClient === 'function' &&
  typeof client.set === 'function' &&
  typeof client.setAsync === 'function'

const createKthRedis3Wrapper = client => ({
  detectedVersion: 'kth-node-redis@3',
  set: async (key, value, callback) => {
    return client.set(key, value, callback)
  },
  get: async (key, callback) => {
    return client.get(key, callback)
  },
  expire: async (key, ttl, callback) => {
    return client.expire(key, ttl, callback)
  },
})

module.exports = {
  createRedisWrapper,
}
