const { createRedisWrapper } = require('./redisWrapper')

describe('createRedisWrapper', () => {
  test('Returns a wrapper for kth-node-redis@3', async () => {
    const config = { data: 'my v3 config' }
    const v3client = {
      set: jest.fn(),
      setAsync: jest.fn(),
    }
    const getClient = jest.fn(() => v3client)
    const validRedisDependency = getClient

    validRedisDependency.getClient = getClient

    const result = await createRedisWrapper('apiName', validRedisDependency, config)
    expect(getClient).toHaveBeenCalledWith('apiName', config)
    expect(result).toEqual(
      expect.objectContaining({
        detectedVersion: 'kth-node-redis@3',
        get: expect.any(Function),
        set: expect.any(Function),
        expire: expect.any(Function),
      })
    )
  })
  test('Returns a wrapper for kth-node-redis@4', async () => {
    const config = { data: 'my v4 config' }

    const v4client = {
      set: jest.fn(),
    }
    const getClient = jest.fn(() => v4client)
    const validRedisDependency = getClient

    validRedisDependency.getClient = getClient
    validRedisDependency.version = 'kth-node-redis-4'

    const result = await createRedisWrapper('apiName', validRedisDependency, config)
    expect(getClient).toHaveBeenCalledWith('apiName', config)
    expect(result).toEqual(
      expect.objectContaining({
        detectedVersion: 'kth-node-redis@4',

        get: expect.any(Function),
        set: expect.any(Function),
        expire: expect.any(Function),
      })
    )
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
})
