/* eslint-disable no-console */

jest.mock('kth-node-redis')

const redisClient = {}

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

const logConsole = false
const mockLogger = {
  debug: logConsole ? console.log : () => {},
  error: logConsole ? console.log : () => {},
  warn: logConsole ? console.log : () => {},
  info: logConsole ? console.log : () => {},
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

const paths = {}

const apicall = uri => {
  const myUri = uri.uri ? uri.uri : uri
  return new Promise((resolve, reject) => {
    if (paths[myUri]) {
      resolve(paths[myUri].shift())
    } else {
      reject(new Error('Path ' + myUri + ' not found.'))
    }
  })
}

jest.mock('./basic', () =>
  jest.fn().mockImplementation(() => ({
    getAsync: jest.fn(apicall),
  }))
)

describe('Testing connection', () => {
  const originalProcessExit = process.exit
  beforeAll(() => {
    process.exit = jest.fn()
  })

  it(IS_ACCESSIBLE, () => expect(connections.setup).toBeFunction())

  it('should throw exception if no api config is provided or not object', () => {
    expect(() => connections.setup('INVALID', mockApiKeyConfig, opts)).toThrowError(/Apis config is required/)
  })

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
      expect(process.exit).not.toBeCalled()
      expect(output.testApi.client.getAsync).toBeCalled()
      done()
    }, 500) // wait for setup to finish
  })

  it('should not test connection if doNotCallPathsEndpoint is set', done => {
    paths['/api/test/_checkAPIkey'] = [{ statusCode: 200, body: {} }]

    const output = connections.setup(
      { testApi: { ...mockApiConfig.testApi, doNotCallPathsEndpoint: true } },
      mockApiKeyConfig,
      { ...opts }
    )
    setTimeout(() => {
      expect(output.testApi.connected).toBeTrue()
      expect(process.exit).not.toBeCalled()
      // Should only be called once to check API key
      expect(output.testApi.client.getAsync).toBeCalledTimes(1)
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

  afterAll(() => {
    process.exit = originalProcessExit
  })
})
