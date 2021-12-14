const RequestMockup = require('request')

const DummyLogMockup = {
  log: jest.fn(),
}

const DummyRedisMockup = {
  client: {},
}

const AllMockups = { RequestMockup, DummyLogMockup, DummyRedisMockup }

const BasicApiExport = require('./basic')

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
