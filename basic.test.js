/* eslint-disable no-console */
const { IS_ACCESSIBLE } = require('./test-utils')

const BasicAPI = require('./basic')
const apiserver = require('./test/mock-api/server')

const logConsole = false
const mockLogger = {
  debug: logConsole ? console.log : () => {},
  error: logConsole ? console.log : () => {},
  warn: logConsole ? console.log : () => {},
  info: logConsole ? console.log : () => {},
}

const opts = {
  hostname: '127.0.0.1',
  host: 'localhost',
  port: '3210',
  https: false,
  json: true,
  defaultTimeout: 2790,
  headers: { 'Content-Type': 'application/json' },
  retryOnESOCKETTIMEDOUT: true,
  maxNumberOfRetries: 7,
  basePath: '/api/test',
}

const api = BasicAPI(opts)

describe('basic calls works as expected', () => {
  it('performs a successful get request when calling get', done => {
    api.get('/method', (error, response, body) => {
      expect(body.method).toBe('get')
      expect(response.statusCode).toBe(200)
      done()
    })
  })
  it('performs a successful post request when calling post', done => {
    api.post('/method', (error, response, body) => {
      expect(body.method).toBe('post')
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

  it('performs a successful get request when calling getAsync', async () => {
    const result = await api.getAsync('/method')
    expect(result.body.method).toBe('get')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful post request when calling postAsync', async () => {
    const result = await api.postAsync('/method')
    expect(result.body.method).toBe('post')
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
  afterAll(async () => {
    await api.getAsync('/goodbye')
  })
})
/*
const { EXPECTS, RETURNS, IS_ACCESSIBLE, bold, copyObject, WORKS } = require('./test-utils')

function runTestsAboutPrototypeMethods() {
  describe(`has a prototype which`, () => {
    const { prototype } = BasicApiExport

    const expectedMethods = [
      { name: 'get', caption: 'two arguments (options, callback)', length: 2 },
      { name: 'getAsync', caption: 'one argument (options)', length: 1 },
      { name: 'post', caption: 'two arguments (options, callback)', length: 2 },
      { name: 'postAsync', caption: 'one argument (options)', length: 1 },
      { name: 'put', caption: 'two arguments (options, callback)', length: 2 },
      { name: 'putAsync', caption: 'one argument (options)', length: 1 },
      { name: 'del', caption: 'two arguments (options, callback)', length: 2 },
      { name: 'delAsync', caption: 'one argument (options)', length: 1 },
      { name: 'head', caption: 'two arguments (options, callback)', length: 2 },
      { name: 'headAsync', caption: 'one argument (options)', length: 1 },
      { name: 'patch', caption: 'two arguments (options, callback)', length: 2 },
      { name: 'patchAsync', caption: 'one argument (options)', length: 1 },
      { name: 'cookie', caption: 'one argument (cookie)', length: 1 },
      { name: 'jar', caption: 'no arguments', length: 0 },
      { name: 'defaults', caption: 'two arguments (options)', length: 1 },
      { name: 'resolve', caption: 'two arguments (uri, params)', length: 2 },
    ]

    const maxNameLength = Math.max(...expectedMethods.map(item => item.name.length))

    it(`is named "BasicAPI"`, () => expect(prototype.constructor.name).toBe('BasicAPI'))

    it(`contains the expected ${expectedMethods.length} methods`, () => {
      expect(prototype).toContainAllKeys(expectedMethods.map(item => item.name))
    })

    expectedMethods.forEach(({ name, caption, length }) => {
      const method = bold(`${name}()`.padEnd(maxNameLength + 2, ' '))
      it(`has a method ${method} that ${IS_ACCESSIBLE} and ${EXPECTS} ${caption}`, () => {
        expect(prototype[name]).toBeFunction()
        expect(prototype[name]).toHaveLength(length)
      })
    })
  })
}

function getTestOptions(target) {
  switch (target) {
    case 'full':
      return {
        protocol: 'http',
        https: false,
        host: 'localhost',
        hostname: '127.0.0.1',
        port: '3007',
        headers: { 'Content-Type': 'application/json' },
        json: { dummy: 'test' },
        redis: DummyRedisMockup,
        basePath: '/api/program',
        defaultTimeout: 2790,
        retryOnESOCKETTIMEDOUT: true,
        maxNumberOfRetries: 7,
        log: DummyLogMockup,
      }

    default:
      throw new Error('Invalid target')
  }
}

describe.skip('Exported function "BasicAPI"', () => {
  it(IS_ACCESSIBLE, () => expect(BasicApiExport).toBeFunction())

  runTestsAboutPrototypeMethods()

  it(`${EXPECTS} two arguments (options, base)`, () => expect(BasicApiExport).toHaveLength(2))

  it(`- when used w/o arguments - ${RETURNS} an instance of class "BasicAPI"`, () => {
    const result = BasicApiExport()

    expect(result).toBeObject()
    expect(result.constructor.name).toBe('BasicAPI')

    const copy = copyObject(result, { replaceFunctions: true })
    expect(copy).toEqual({
      _basePath: '',
      _defaultTimeout: 2000,
      _hasRedis: false,
      _log: undefined,
      _maxNumberOfRetries: 5,
      _redis: undefined,
      _request: {
        _self: '(MOCK:0 calls)',
        props: {
          defaults: '(MOCK:1 call)',
          get: '(MOCK:0 calls)',
        },
      },
      _retryOnESOCKETTIMEDOUT: undefined,
    })
  })

  it(`- when used with empty "options" - ${RETURNS} an instance of class "BasicAPI"`, () => {
    const result = BasicApiExport({})

    expect(result).toBeObject()
    expect(result.constructor.name).toBe('BasicAPI')

    const copy = copyObject(result, { replaceFunctions: true })
    expect(copy).toEqual({
      _basePath: '',
      _defaultTimeout: 2000,
      _hasRedis: false,
      _log: undefined,
      _maxNumberOfRetries: 5,
      _redis: undefined,
      _request: {
        _self: '(MOCK:0 calls)',
        props: {
          defaults: '(MOCK:1 call)',
          get: '(MOCK:0 calls)',
        },
      },
      _retryOnESOCKETTIMEDOUT: undefined,
    })
  })

  it(`- when used with all valid "options" - ${RETURNS} an instance of class "BasicAPI"`, () => {
    const options = getTestOptions('full')

    const result = BasicApiExport(options)

    expect(result).toBeObject()
    expect(result.constructor.name).toBe('BasicAPI')

    const copy = copyObject(result, { replaceFunctions: true })
    expect(copy).toEqual({
      _basePath: '/api/program',
      _defaultTimeout: 2790,
      _hasRedis: true,
      _log: {
        log: '(MOCK:0 calls)',
      },
      _maxNumberOfRetries: 7,
      _redis: {
        client: {},
      },
      _request: {
        _self: '(MOCK:0 calls)',
        props: {
          defaults: '(MOCK:1 call)',
          get: '(MOCK:0 calls)',
        },
      },
      _retryOnESOCKETTIMEDOUT: true,
    })
  })

  it(`- when used with all valid "options" - ${WORKS} as expected`, () => {
    const options = getTestOptions('full')

    const api = BasicApiExport(options)

    const allCalls = copyObject(AllMockups, { replaceFunctions: true })
    expect(allCalls).toEqual({
      DummyLogMockup: {
        log: '(MOCK:0 calls)',
      },
      DummyRedisMockup: {
        client: {},
      },
      RequestMockup: {
        _self: '(MOCK:0 calls)',
        props: {
          defaults: '(MOCK:1 call)',
          get: '(MOCK:0 calls)',
        },
      },
    })

    expect(RequestMockup.defaults).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3007',
      headers: options.headers,
      json: options.json,
      pool: { maxSockets: Infinity },
    })

    expect(api._request).toBe(RequestMockup)
  })

  it(`- when used ${bold('twice')} with same valid "options" - ${RETURNS} two different objects`, () => {
    const options = getTestOptions('full')

    const result1 = BasicApiExport(options)
    const result2 = BasicApiExport(options)

    expect(result1).not.toBe(result2)
  })

  describe(`returns an ${bold('instance of class "BasicAPI"')} that`, () => {
    const options = getTestOptions('full')

    let api
    beforeAll(() => {
      api = BasicApiExport(options)
    })

    it(`has a method get(options, callback) with expected behaviour`, async () => {
      const get = api.get.bind(api)

      expect(get).toThrow('Cannot read propert') // Originally 'property', changed to accommodate 'properties' as well

      get('test/1')

      const allCalls = copyObject(AllMockups, { replaceFunctions: true })
      expect(allCalls).toEqual({
        DummyLogMockup: {
          log: '(MOCK:0 calls)',
        },
        DummyRedisMockup: {
          client: {},
        },
        RequestMockup: {
          _self: '(MOCK:0 calls)',
          props: {
            defaults: '(MOCK:0 calls)',
            get: '(MOCK:1 call)',
          },
        },
      })

      expect(RequestMockup.get).toHaveBeenCalledTimes(1)
      const getCallArguments = copyObject(RequestMockup.get.mock.calls[0], { replaceFunctions: true })
      expect(getCallArguments).toEqual([
        {
          headers: { 'request-guid': getCallArguments[0].requestGuid },
          requestGuid: getCallArguments[0].requestGuid,
          uri: '/api/programtest/1',
        },
        '(FUNC:anonymous)',
      ])
    })
  })
})
*/
/*

  xit('should retry GET,POST,PUT,DELETE,PATCH,HEAD call on ESOCKETTIMEDOUT', done => {
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
    paths['/api/test/error'] = Array(6 * 6).fill({ answerTimeout: true })

    const output = connections.setup(mockApiConfig, mockApiKeyConfig, { ...opts, retryOnESOCKETTIMEDOUT: true })
    setTimeout(() => {
      const { client } = output.testApi
      client.getAsync('/api/test/error').catch(e1 => {
        console.log(paths['/api/test/error'].length)
        expect(e1.message).toContain('retries. The connection to the API seems to be overloaded.')
        done()
      })
    }, 500) // wait for setup to finish
  })


*/

/*
const BasicAPI = require('./basic')
    const opts = {
      hostname: "www.google.com",
      port: 443,
      https: true,
      json: true,
      defaultTimeout: 600,
      headers: {},
      retryOnESOCKETTIMEDOUT: false,
      maxNumberOfRetries: 2,
      log:  {},
    }
  const c=new BasicAPI(opts)
   c.getAsync("/") 
*/
