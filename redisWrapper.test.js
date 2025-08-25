const { createRedisWrapper } = require('./redisWrapper')

describe('createRedisWrapper', () => {
  test('Works fine for the supported version', async () => {
    const validRedisDependency = () => ({
      set: jest.fn(),
      setAsync: jest.fn(),
    })
    validRedisDependency.getClient = jest.fn()

    await expect(createRedisWrapper('apiName', validRedisDependency, {})).toResolve()
  })
  test('throws error for library that dont have an exported "getClient" function', async () => {
    const invalidRedisDependency = () => ({
      set: jest.fn(),
      setAsync: jest.fn(),
    })

    await expect(createRedisWrapper('apiName', invalidRedisDependency, {})).rejects.toThrow(
      '@kth/api-call was configured with an unsupported Redis version'
    )
  })
  test('throws error for library that dont generate a "setAsync" function', async () => {
    const invalidRedisDependency = () => ({
      set: jest.fn(),
    })
    invalidRedisDependency.getClient = jest.fn()

    await expect(createRedisWrapper('apiName', invalidRedisDependency, {})).rejects.toThrow(
      '@kth/api-call was configured with an unsupported Redis version'
    )
  })
})
