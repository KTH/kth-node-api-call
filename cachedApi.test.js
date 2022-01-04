const cachedApi = require('./cachedApi')

const mockRedisStorage = {}
// Mock for redis, to test caching
const redisGet = jest.fn().mockImplementation(
  key =>
    new Promise((resolve, reject) => {
      if (mockRedisStorage[key]) {
        resolve(mockRedisStorage[key])
      }
      reject(new Error('Not found'))
    })
)
const redisSet = jest.fn().mockImplementation(
  (key, value) =>
    new Promise(resolve => {
      mockRedisStorage[key] = { cached: value }
      resolve('OK')
    })
)

const options = {
  https: false,
  host: 'localhost',
  port: '3210',
  path: '/api/test/apitest',
  cache: {
    get: redisGet,
    set: redisSet,
  },
}
const testCachedApi = cachedApi(options)

describe('cachedApi calls works as expected', () => {
  it('should return second call from cache when calling promisedGetText and promisedApiCall', async () => {
    const apiData = await testCachedApi.promisedApiCall()
    expect(apiData).toBe('*/*')
    const cachedApiData = await testCachedApi.promisedApiCall()
    expect(cachedApiData.cached).toBe('*/*')
    delete mockRedisStorage['/api/test/apitest']
    const data = await testCachedApi.promisedGetText()
    expect(data).toBe('text/plain')
    const cachedData = await testCachedApi.promisedGetText()
    expect(cachedData.cached).toBe('text/plain')
  })
})
