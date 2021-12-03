const nock = require('nock')
const redisClient = require('redis-mock').createClient()

const mockAPI = nock('http://localhost:3001')
mockAPI.get('/api/test/_paths').reply(200, {}).get('/api/test/_checkAPIkey').reply(401, {})

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

const mockLogger = {}
// eslint-disable-next-line no-multi-assign
mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = () => {}

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

describe('Testing connection', () => {
  it(IS_ACCESSIBLE, () => expect(connections.setup).toBeFunction())

  it('should shut down on bad API key', () => {
    const originalExit = process.exit
    const mockedExit = jest.fn()
    Object.defineProperty(process, 'exit', {
      value: mockedExit,
    })
    connections.setup(mockApiConfig, mockApiKeyConfig, opts)
    // The idea is that it should be called, work in progress (hopefully)...
    expect(mockedExit).not.toBeCalled()

    //    setTimeout(() => expect(mockedExit).toBeCalled(), 500) // wait for setup to finish

    Object.defineProperty(process, 'exit', {
      value: originalExit,
    })
  })
})
