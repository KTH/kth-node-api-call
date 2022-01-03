/* eslint-disable no-console */
const BasicAPI = require('./basic')

// Test api server
require('./test/mock-api/server')

const logConsole = false
const mockLogger = {
  debug: logConsole ? console.log : () => {},
  error: logConsole ? console.log : () => {},
  warn: logConsole ? console.log : () => {},
  info: logConsole ? console.log : () => {},
}

// Mock for redis, to test caching
const redisGet = jest.fn().mockImplementation((key, callback) => {
  if (key === 'mocktest:get:/api/test/cached') {
    return callback(undefined, '{ "body": "from cache", "statusCode": 200 }')
  }
  return callback(undefined, undefined)
})
const redisSet = jest.fn().mockImplementation((key, value, callback) => {
  callback(undefined, 'OK')
})

const opts = {
  hostname: '127.0.0.1',
  host: 'localhost:3210',
  https: false,
  json: true,
  defaultTimeout: 50,
  retryOnESOCKETTIMEDOUT: true,
  maxNumberOfRetries: 2,
  basePath: '/api/test',
  log: mockLogger,
  redis: {
    prefix: 'mocktest',
    client() {
      return Promise.resolve({
        set: redisSet,
        get: redisGet,
        expire: (key, limit, callback) => {
          callback(undefined, 'OK')
        },
      })
    },
    expire: undefined,
  },
}

const api = BasicAPI(opts)
opts.retryOnESOCKETTIMEDOUT = false
opts.host = 'localhost'
opts.port = '666'
const noRetryApi = BasicAPI(opts)

describe('basic calls works as expected', () => {
  // Test callback based functions
  it('performs a successful get request when calling get', done => {
    api.get('/method', (error, response, body) => {
      expect(body.method).toBe('get')
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful post request when calling post', done => {
    api.post({ uri: '/method', body: { test: true } }, (error, response, body) => {
      expect(body).toStrictEqual({ postdata: { test: true }, method: 'post' })
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful post request with formData when calling post', done => {
    api.post({ uri: '/method', formData: { test: 'formData' } }, (error, response, body) => {
      expect(body).toStrictEqual({ postdata: { test: 'formData' }, method: 'post' })
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful put request when calling put', done => {
    api.put('/method', (error, response, body) => {
      expect(body.method).toBe('put')
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful delete request when calling del', done => {
    api.del('/method', (error, response, body) => {
      expect(body.method).toBe('del')
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful patch request when calling patch', done => {
    api.patch('/method', (error, response, body) => {
      expect(body.method).toBe('patch')
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful head request when calling head', done => {
    api.head('/method', (error, response, body) => {
      expect(body).toBeUndefined()
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  // Test promise based functions
  it('performs a successful get request when calling getAsync', async () => {
    const result = await api.getAsync('/method')
    expect(result.body.method).toBe('get')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful post request when calling postAsync', async () => {
    const result = await api.postAsync({ uri: '/method', body: { test: true } })
    expect(result.body).toStrictEqual({ postdata: { test: true }, method: 'post' })
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful post request with formData when calling postAsync', async () => {
    const result = await api.postAsync({ uri: '/method', formData: { test: 'formData' } })
    expect(result.body).toStrictEqual({ postdata: { test: 'formData' }, method: 'post' })
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful put request when calling putAsync', async () => {
    const result = await api.putAsync('/method')
    expect(result.body.method).toBe('put')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful delete request when calling delAsync', async () => {
    const result = await api.delAsync('/method')
    expect(result.body.method).toBe('del')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful patch request when calling patchAsync', async () => {
    const result = await api.patchAsync('/method')
    expect(result.body.method).toBe('patch')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful head request when calling headAsync', async () => {
    const result = await api.headAsync('/method')
    expect(result.body).toBeUndefined()
    expect(result.statusCode).toBe(200)
  })

  // Test Redis caching
  it('should pick value from cache if enabled and key exists when calling getAsync', async () => {
    const result = await api.getAsync({ uri: '/cached', useCache: true })
    expect(result.body).toBe('from cache')
    expect(result.statusCode).toBe(200)
    expect(redisGet).toBeCalledWith('mocktest:get:/api/test/cached', expect.anything())
  })

  it('should cache value if cache is enabled when calling getAsync', async () => {
    const result = await api.getAsync({ uri: '/method', useCache: true })
    expect(result.body.method).toBe('get')
    expect(result.statusCode).toBe(200)
    expect(redisGet).toBeCalledWith('mocktest:get:/api/test/method', expect.anything())
    expect(redisSet).toBeCalledWith(
      'mocktest:get:/api/test/method',
      '{"size":0,"timeout":50,"statusCode":200,"body":{"method":"get","query":{}}}',
      expect.anything()
    )
  })

  // Test retries on timeout
  it('should retry on timeout', async () => {
    api._request.post = jest.fn().mockImplementation(async (options, callback) => {
      callback(new Error('ESOCKETTIMEDOUT'))
    })

    await api.postAsync('/timeout').catch(e => {
      expect(e.message).toContain('timed out after 2 retries. The connection to the API seems to be overloaded.')
      expect(api._request.post).toBeCalledTimes(3)
    })
  })
  it('should not retry on timeout', async () => {
    noRetryApi._request.post = jest.fn().mockImplementation(async (options, callback) => {
      callback(new Error('ESOCKETTIMEDOUT'))
    })

    await noRetryApi.postAsync('/timeout').catch(e => {
      expect(e.message).toContain('ESOCKETTIMEDOUT')
      expect(noRetryApi._request.post).toBeCalledTimes(1)
    })
  })

  // Shut down test api server
  afterAll(done => {
    api.getAsync('/goodbye')
    setTimeout(done, 500)
  })
})
