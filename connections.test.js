const redisClient = require('redis-mock').createClient()

const { IS_ACCESSIBLE } = require('./test-utils')

const connections = require('./connections')

const mockApiConfig = {
  testApi: {
    https: false,
    port: 3001,
    host: 'localhost',
    proxyBasePath: '/api/test',
    required: true,
  },
}

const mockApiKeyConfig = {
  testApi: '1234',
}

const mockLogger = {
  debug: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
}

const opts = {
  log: mockLogger,
  redis() {
    return Promise.resolve(redisClient)
  },
  timeout: 100,
  cache: {
    testApi: mockApiConfig,
  },
  checkAPIs: true, // performs api-key checks against the apis, if a 'required' check fails, the app will exit. Required apis are specified in the config
}

jest.mock('./basic', () =>
  jest.fn().mockImplementation(() => ({
    getAsync: ({ uri }) => {
      const paths = {
        '/api/test/_paths': { statusCode: 200, body: {} },
        '/api/test/_checkAPIkey': { statusCode: 401, body: {} },
      }
      return new Promise((resolve, reject) =>
        process.nextTick(() => (paths[uri] ? resolve(paths[uri]) : reject(new Error('Path ' + uri + ' not found.'))))
      )
    },
  }))
)

describe('Testing connection', () => {
  it(IS_ACCESSIBLE, () => expect(connections.setup).toBeFunction())

  it('should shut down on bad API key', done => {
    const originalExit = process.exit
    const mockedExit = jest.fn()
    global.process.exit = mockedExit
    connections.setup(mockApiConfig, mockApiKeyConfig, opts)

    setTimeout(() => {
      global.process.exit = originalExit
      expect(mockedExit).toBeCalledWith(1)
      done()
    }, 500) // wait for setup to finish
  })
})
