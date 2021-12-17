/* eslint-disable func-names */
/* eslint-disable no-use-before-define */
/**
 * Class to handle json api calls
 * @type {*}
 */
const apiCaller = require('./api')

module.exports = (function () {
  /**
   * Wrap our constructor in a factory method.
   * @param options our options object
   * @returns {CachedApi} a new instance of an Api class
   */
  function factory(options) {
    return new CachedApi(options)
  }

  /**
   * Constructor for the Api class
   * @param options the options object:
   * {
   *  port : int / default: 443
   *  method : string / default: GET
   *  host : string / default: none / MANDATORY
   *  path : string / default: '/'
   *  debugMode : boolean / default: false
   *  https : boolean / default: true
   *  headers : object / default: undefined
   *  json : boolean / default: false
   * }
   * @constructor
   */
  function CachedApi(options) {
    this.api = apiCaller(options)
    this.key = options.path
    this.log = options.log

    this.debugMode = options.debugMode || false

    if (!options.cache) {
      throw new Error('Cannot create cached API without reference to a cache implementation')
    }

    this.cache = options.cache

    this.debugPrint = function (msg) {
      const self = this
      if (self.debugMode) {
        // eslint-disable-next-line no-console
        console.log(msg)
      }
    }
  }

  /**
   * Sends a GET request to the configured api expecting a text/plain response
   */
  CachedApi.prototype.promisedGetText = function () {
    const self = this
    self.debugPrint('Calling promisedGetText for path: ' + self.key)

    return readRedisCache(self).catch(err => {
      self.debugPrint('Not found in cache[' + err + '], try data source: ' + self.key)
      return self.api.promisedGetText().then(result => storeInRedisAndReturnResult(self, result))
    })
  }

  /**
   * Method returning api calls as promise.
   * The promise will be resolved with
   * - the error if call fails
   * - the response object/json
   * @return Promise for the api call
   */
  CachedApi.prototype.promisedApiCall = function () {
    const self = this
    self.debugPrint('Calling promisedApiCall for path: ' + self.key)

    return readRedisCache(self)
      .then(result => {
        let jsonResult = result
        if (typeof result === 'string') {
          jsonResult = JSON.parse(result)
        }
        return jsonResult
      })
      .catch(err => {
        self.debugPrint('Not found in cache[' + err + '], try data source: ' + self.key)
        return self.api.promisedApiCall().then(result => storeInRedisAndReturnResult(self, result))
      })
  }

  // helper functions
  // TODO ta in app prefix från package med require(package)
  function readRedisCache(self) {
    self.debugPrint('Read redis cache for: ' + self.key)
    return self.cache.get(self.key)
  }

  function storeInRedisAndReturnResult(self, result) {
    self.debugPrint('Store value in redis cache by: ' + self.key)
    let value = result
    if (typeof value === 'object') {
      value = JSON.stringify(result)
    }
    self.cache.set(self.key, value)
    return result
  }

  return factory
})()
