/* eslint-env mocha */

const expect = require('chai').expect

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
})

mockAPI.get('/api/test/_checkAPIKey').reply(401, {})

// const mockery = require('mockery')

// const mockApiClient = function () {}

// mockApiClient.prototype.getAsync = function () {
//   return Promise.resolve({
//     statusCode: 200,
//     body: {
//       api: {
//         'path1': {
//           'uri': '/api/test/v1/path1/:param1',
//           'method': 'PUT',
//           'apikey': {
//             'scope_required': true,
//             'scopes': ['write'],
//             'type': 'api_key'
//           }
//         },
//         'path2': {
//           'uri': '/api/test/v1/test/path2/:param',
//           'method': 'GET',
//           'apikey': {
//             'scope_required': true,
//             'scopes': ['read'],
//             'type': 'api_key'
//           }
//         }
//       }
//     }
//   })
// }

const mockApiConfig = {
  testApi: {
    https: false,
    port: 3001,
    host: 'localhost',
    proxyBasePath: '/api/test'
  }
}

const mockApiKeyConfig = {
  testApi: '1234'
}
const mockLogger = {}
mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = () => {}

const opts = {
  log: mockLogger,
  // redis: redis,
  // reconnectTimeout: 30000,
  // cache: config.cache,
  checkAPIs: true // performs api-key checks against the apis, if a 'required' check fails, the app will exit. Required apis are specified in the config
}

// mockery.enable({
//   warnOnReplace: false,
//   warnOnUnregistered: false
// })

// mockery.registerMock('./basic', mockApiClient)

const connections = require('../connections')

describe('Testing api', function () {
  it('should set up connections', function (done) {
    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts)
    setTimeout(function () {
      expect(output.testApi.connected).to.be.true
      done()
    }, 500) // wait for setup to finish
  })
})
