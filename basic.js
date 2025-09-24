/* eslint-disable func-names */

'use strict'

const urlJoin = require('url-join')
const { v4: uuidv4 } = require('uuid')
const { fetchWrappers, removeUndefined } = require('./fetchUtils')

const REQUEST_GUID = 'request-guid'
const NO_REPLY_REJECT_CODE = 'no_reply'

function _toBaseUrl({ protocol, https, host, hostname, port }) {
  let baseurl = host || hostname || 'http://localhost'
  if (!baseurl.includes('://')) baseurl = `http://${baseurl}`
  const myUrl = new URL(baseurl)
  myUrl.protocol = protocol || (https ? 'https:' : 'http:')
  if (protocol) myUrl.protocol = protocol
  if (port) myUrl.port = port
  return myUrl.toString()
}

/**
 * Creates a wrapper around request with useful defaults.
 * @param {object} [options] - plain js object with options
 * @param {string} [options.host] - set hostname and port, e.g. 'www.example.org:80'
 * @param {string} [options.hostname='localhost'] - set hostname, e.g. 'www.example.org'
 * @param {string|number} [options.port] - set custom port, e.g. 80
 * @param {boolean} [options.https] - set true to use https, e.g. true
 * @param {string} [options.protocol] - explicitly set protocol, e.g. 'https:'
 * @param {string} [options.basePath] - optional base path to prefix requests with
 * @param {boolean} [options.json] - automatically call JSON.parse/stringify
 * @param {object} [options.headers] - custom HTTP headers
 * @param {object} [options.redis] - configure redis to enable caching
 * @param {*} [options.redis.client] - a node-redis compatible client
 * @param {string} [options.redis.prefix] - redis key prefix
 * @param {number} [options.redis.expire=300] - expiration time in seconds
 * @param {BasicAPI} [base] - used internally when calling defaults
 * @constructor
 */
function BasicAPI(options, base) {
  if (!(this instanceof BasicAPI)) {
    return new BasicAPI(options, base)
  }

  const myOptions = { headers: {}, ...options }

  if (base) {
    this._request = base._request.defaults(myOptions)
    this._redis = base._redis
    this._hasRedis = base._hasRedis
  } else {
    const opts = {
      baseUrl: _toBaseUrl(myOptions),
      headers: myOptions.headers,
      json: myOptions.json,
      pool: { maxSockets: Infinity },
    }

    this._request = fetchWrappers(opts)
    this._redis = myOptions.redis
    this._hasRedis = !!(this._redis && (this._redis.client || this._redis.getClient ))
    this._basePath = myOptions.basePath || ''
    this._defaultTimeout = myOptions.defaultTimeout || 2000
    this._retryOnESOCKETTIMEDOUT = myOptions.retryOnESOCKETTIMEDOUT ? myOptions.retryOnESOCKETTIMEDOUT : undefined
    this._maxNumberOfRetries = myOptions.maxNumberOfRetries ? myOptions.maxNumberOfRetries : 5
    this._log = myOptions.log
  }
}

/**
 * ESOCKETTIMEDOUT, ETIMEDOUT, and node-fetch timeout errors return true.
 * @param {*} e
 */
const isTimeoutError = e => {
  let errorStr
  if (e.name.includes('Error')) {
    errorStr = e.toString().toLowerCase()
    return errorStr.includes('timedout') || errorStr.includes('timeout')
  }
  if (typeof e === 'object') {
    errorStr = JSON.stringify(e).toLowerCase()
    return errorStr.includes('timedout') || errorStr.includes('timeout')
  }
  errorStr = e.toString().toLowerCase()
  return errorStr.includes('timedout') || errorStr.includes('timeout')
}

const retryWrapper = (_this, cb, args) => {
  let counter = 0

  const sendRequest = () =>
    cb.apply(_this, args).catch(e => {
      if (isTimeoutError(e) && counter < _this._maxNumberOfRetries) {
        counter++
        const myUrl = typeof args[2] === 'object' ? args[2].uri : args[2]
        if (_this._log) {
          _this._log.info(
            `Request with guid ${_this.lastRequestGuid} to "${myUrl}" failed, Retry ${counter}/${_this._maxNumberOfRetries}`
          )
        }
        return sendRequest()
      }
      if (isTimeoutError(e)) {
        throw new Error(
          `The request with guid ${_this.lastRequestGuid} timed out after ${counter} retries. The connection to the API seems to be overloaded.`
        )
      } else {
        throw e
      }
    })

  return sendRequest()
}

function _getURI(api, options) {
  const relpath = typeof options === 'string' ? options : options.uri || ''
  const queryObj = removeUndefined(options.qs || {})
  const queryString = new URLSearchParams(queryObj).toString()
  if (queryString) return urlJoin(api._basePath, relpath, '?' + queryString)
  return urlJoin(api._basePath, relpath)
}

function _getKey(api, options, method) {
  const prefix = api._redis.prefix ? api._redis.prefix + ':' : ''
  return prefix + method + ':' + _getURI(api, options)
}

function _wrapCallback(api, options, method, callback) {
  return async (error, result, body) => {
    if (error) {
      callback(error, result, body)
      return
    }

    if (api._hasRedis && options.useCache && result.statusCode >= 200 && result.statusCode < 400) {
      setRedisResult(api, options, method, result, body)
    }

    callback(error, result, body)
  }
}

const setRedisResult = async (api, options, method, result, body) => {
  const key = _getKey(api, options, method)
  const redisData = { ...result, body }
  const value = JSON.stringify(redisData)

  try {
    const redisClient = await api._redis.getClient()

    redisClient.set(key, value, err => {
      if (err) {
        api._log.error('@kth/api-call redis.set failed', err)
      }
    })
    redisClient.expire(key, api._redis.expire || 300, err => {
      if (err) {
        api._log.error('@kth/api-call redis.expire failed', err)
      }
    })
  } catch (error) {
    api._log.error('@kth/api-call caching result in Redis failed', error)
  }
}

function _makeRequest(api, options, method, callback) {
  const fullUriPath = _getURI(api, options)
  let opts
  if (typeof options === 'string') {
    opts = {
      uri: options,
      requestGuid: uuidv4(),
      headers: {},
    }
  } else {
    opts = { headers: {}, requestGuid: uuidv4(), ...options }
  }
  opts.headers[REQUEST_GUID] = opts.requestGuid
  api.lastRequestGuid = opts.requestGuid // eslint-disable-line no-param-reassign
  const cb = _wrapCallback(api, opts, method, callback)
  return api._request[method]({ ...opts, uri: fullUriPath }, cb)
}

function _exec(api, options, method, callback) {
  if (api._hasRedis && options.useCache) {
    const key = _getKey(api, options, method)

    Promise.resolve(api._redis.getClient())
      .then(
        client =>
          new Promise((resolve, reject) => {
            client
              .get(key, (err, reply) => {
                if (err) {
                  reject(err)
                } else if (!reply) {
                  reject(NO_REPLY_REJECT_CODE)
                } else {
                  // TODO: Should we catch parse errors and return a reasonable message or
                  // is this good enough?
                  const value = JSON.parse(reply)
                  resolve(callback(null, value, value.body))
                }
              })
              .catch(error => {
                reject(error)
              })
          })
      )
      .catch(error => {
        if (error !== NO_REPLY_REJECT_CODE) {
          api._log.error('@kth/api-call could not get cached result from Redis', error)
        }
        _makeRequest(api, options, method, callback)
      })
  } else {
    _makeRequest(api, options, method, callback)
  }
}

/**
 * Sends an HTTP GET request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.get = function (options, callback) {
  return _exec(this, options, 'get', callback)
}

function _createPromiseCallback(resolve, reject) {
  return function (error, response, body) {
    if (error) {
      reject(error)
    } else {
      resolve({
        response,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        body,
      })
    }
  }
}

function _createPromise(api, func, options) {
  // Create a options object so we can add default timeout
  let opt
  if (typeof options !== 'object') {
    opt = { timeout: api._defaultTimeout, uri: options }
  } else {
    opt = { timeout: api._defaultTimeout, ...options }
  }

  return new Promise((resolve, reject) => {
    func.call(api, opt, _createPromiseCallback(resolve, reject))
  })
}

/**
 * Sends an HTTP GET request using a promise.
 * @param {string|object} options
 * @returns {Promise}
 */
BasicAPI.prototype.getAsync = function (options) {
  if (this._retryOnESOCKETTIMEDOUT) {
    return retryWrapper(this, _createPromise, [this, this.get, options])
  }

  return _createPromise(this, this.get, options)
}

/**
 * Sends an HTTP POST request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.post = function (options, callback) {
  return _exec(this, options, 'post', callback)
}

/**
 * Sends an HTTP POST request using a promise.
 * @param {string|object} options
 * @returns {Promise}
 */
BasicAPI.prototype.postAsync = function (options) {
  if (this._retryOnESOCKETTIMEDOUT) {
    return retryWrapper(this, _createPromise, [this, this.post, options])
  }

  return _createPromise(this, this.post, options)
}

/**
 * Sends an HTTP PUT request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.put = function (options, callback) {
  return _exec(this, options, 'put', callback)
}

/**
 * Sends an HTTP PUT request using a promise.
 * @param {string|object} options
 * @returns {Promise}
 */
BasicAPI.prototype.putAsync = function (options) {
  if (this._retryOnESOCKETTIMEDOUT) {
    return retryWrapper(this, _createPromise, [this, this.put, options])
  }

  return _createPromise(this, this.put, options)
}

/**
 * Sends an HTTP DELETE request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.del = function (options, callback) {
  return _exec(this, options, 'del', callback)
}

/**
 * Sends an HTTP DELETE request using a promise.
 * @param {string|object} options
 * @returns {Promise}
 */
BasicAPI.prototype.delAsync = function (options) {
  if (this._retryOnESOCKETTIMEDOUT) {
    return retryWrapper(this, _createPromise, [this, this.del, options])
  }

  return _createPromise(this, this.del, options)
}

/**
 * Sends an HTTP HEAD request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.head = function (options, callback) {
  return _exec(this, options, 'head', callback)
}

/**
 * Sends an HTTP HEAD request using a promise.
 * @param {string|object} options
 * @returns {Promise}
 */
BasicAPI.prototype.headAsync = function (options) {
  if (this._retryOnESOCKETTIMEDOUT) {
    return retryWrapper(this, _createPromise, [this, this.head, options])
  }

  return _createPromise(this, this.head, options)
}

/**
 * Sends an HTTP PATCH request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.patch = function (options, callback) {
  return _exec(this, options, 'patch', callback)
}

/**
 * Sends an HTTP PATCH request using a promise.
 * @param {string|object} options
 * @returns {Promise}
 */
BasicAPI.prototype.patchAsync = function (options) {
  if (this._retryOnESOCKETTIMEDOUT) {
    return retryWrapper(this, _createPromise, [this, this.patch, options])
  }

  return _createPromise(this, this.patch, options)
}

/**
 * Using this request as base, create a new BasicAPI instance
 * passing the options directly into `request.defaults()`.
 * @deprecated since version 4
 * @param {object} options
 * @returns {BasicAPI}
 */
BasicAPI.prototype.defaults = function (options) {
  return new BasicAPI(options, this)
}

BasicAPI.prototype.resolve = function (uri, params) {
  let myUri = uri
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key]
      myUri = myUri.replace(new RegExp(':' + key, 'gi'), encodeURIComponent(value))
    }
  }

  return myUri
}

module.exports = BasicAPI
