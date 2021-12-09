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
/* const mockLogger = {}
mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = console.log */

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

const paths = {}

jest.mock('./basic', () =>
  jest.fn().mockImplementation(() => ({
    getAsync: uri => {
      const myUri = uri.uri ? uri.uri : uri
      return new Promise((resolve, reject) =>
        paths[myUri] ? resolve(paths[myUri].shift()) : reject(new Error('Path ' + myUri + ' not found.'))
      )
    },
  }))
)

process.exit = jest.fn()

describe('Testing connection', () => {
  it(IS_ACCESSIBLE, () => expect(connections.setup).toBeFunction())

  it('should shut down on bad API key', done => {
    paths['/api/test/_paths'] = [{ statusCode: 200, body: {} }]
    paths['/api/test/_checkAPIkey'] = [{ statusCode: 401, body: {} }]

    connections.setup(mockApiConfig, mockApiKeyConfig, opts)

    setTimeout(() => {
      expect(process.exit).toBeCalledWith(1)
      done()
    }, 500) // wait for setup to finish
  })

  it('should set up connections', done => {
    paths['/api/test/_paths'] = [
      {
        statusCode: 200,
        body: {
          path1: {
            uri: '/api/test/v1/path1/:param1',
            method: 'GET',
            apikey: {
              scope_required: true,
              scopes: ['read'],
              type: 'api_key',
            },
          },
        },
      },
    ]
    paths['/api/test/_checkAPIkey'] = [{ statusCode: 200, body: {} }]

    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts)
    setTimeout(() => {
      expect(output.testApi.connected).toBeTrue()
      expect(process.exit).not.toBeCalled()
      done()
    }, 500) // wait for setup to finish
  })

  it("should retry the api connection if it doesn't gets a bad status code response", done => {
    paths['/api/test/_paths'] = [
      { statusCode: 503, body: { message: 'Service Unavailable' } },
      {
        statusCode: 200,
        body: {
          path1: {
            uri: '/api/test/v1/path1/:param1',
            method: 'GET',
            apikey: {
              scope_required: true,
              scopes: ['read'],
              type: 'api_key',
            },
          },
        },
      },
    ]
    paths['/api/test/_checkAPIkey'] = [{ statusCode: 200, body: {} }]

    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts)
    setTimeout(() => {
      expect(output.testApi.connected).toBeTrue()
      expect(process.exit).not.toBeCalled()
      done()
    }, 500) // wait for setup to finish
  })
})
