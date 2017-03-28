/* eslint-env mocha */

const expect = require('chai').expect
const sinon = require('sinon')

const nock = require('nock')

const mockAPI = nock('http://localhost:3001').get('/api/test/_paths').reply(200, {
  path1: {
    uri: '/api/test/v1/path1/:param1',
    method: 'GET',
    apikey: {
      scope_required: true,
      scopes: ['read'],
      type: 'api_key'
    }
  }
}).get('/api/test/_checkAPIkey').reply(401, {})

const mockApiConfig = {
  testApi: {
    https: false,
    port: 3001,
    host: 'localhost',
    proxyBasePath: '/api/test',
    required: true
  }
}

const mockApiKeyConfig = {
  testApi: '1234'
}
const mockLogger = {}
mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = () => {}
// mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = console.log

const opts = {
  log: mockLogger,
  // redis: redis,
  // reconnectTimeout: 30000,
  // cache: config.cache,
  checkAPIs: true // performs api-key checks against the apis, if a 'required' check fails, the app will exit. Required apis are specified in the config
}

const connections = require('../connections')

describe('Testing api', function () {
  it('should set up connections', function (done) {
    this.originalProcess = process.exit
    Object.defineProperty(process, 'exit', { // mocking out process globally
      value: sinon.spy()
    })
    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts)
    setTimeout(function () {
      expect(output.testApi.connected).to.be.true
      expect(process.exit.called).to.be.true
      done()
    }, 500) // wait for setup to finish
  })
  it('should set up connections', function (done) {
    Object.defineProperty(process, 'exit', { // undo previous exit override
      value: this.originalProcess
    })
    mockAPI
    .get('/api/test/_paths').reply(200, {})
    .get('/api/test/_checkAPIkey').reply(200, {})
    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts)
    setTimeout(function () {
      expect(output.testApi.connected).to.be.true
      done()
    }, 500) // wait for setup to finish
  })
})
