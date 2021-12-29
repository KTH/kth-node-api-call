/* eslint-disable func-names */
/* eslint-disable no-use-before-define */

'use strict'

const querystring = require('querystring')
const url = require('url')
const { v4: uuidv4 } = require('uuid')
const { fetchWrappers } = require('./fetchUtils')

const REQUEST_GUID = 'request-guid'
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

  options = options || {}
  if (!options.headers) {
    options.headers = {}
  }

  if (base) {
    this._request = base._request.defaults(options)
    this._redis = base._redis
    this._hasRedis = base._hasRedis
    return
  }

  const opts = {
    baseUrl: _toBaseUrl(options),
    headers: options.headers,
    json: options.json,
    pool: { maxSockets: Infinity },
  }

  this._request = fetchWrappers(opts)
  this._redis = options.redis
  this._hasRedis = !!(this._redis && this._redis.client)
  this._basePath = options.basePath || ''
  this._defaultTimeout = options.defaultTimeout || 2000
  this._retryOnESOCKETTIMEDOUT = options.retryOnESOCKETTIMEDOUT ? options.retryOnESOCKETTIMEDOUT : undefined
  this._maxNumberOfRetries = options.maxNumberOfRetries ? options.maxNumberOfRetries : 5
  this._log = options.log
}

/**
 * ESOCKETTIMEDOUT or ETIMEDOUT errors return true.
 * @param {*} e
 */
const isTimeoutError = e => {
  if (e.name === 'Error') {
    return e.toString().includes('TIMEDOUT')
  }
  if (typeof e === 'object') {
    return JSON.stringify(e).includes('TIMEDOUT')
  }

  return e.toString().includes('TIMEDOUT')
}

const retryWrapper = (_this, cb, args) => {
  let counter = 0

  const sendRequest = () =>
    cb.apply(_this, args).catch(e => {
      if (isTimeoutError(e) && counter < _this._maxNumberOfRetries) {
        counter++
        const myUrl = typeof args[2] === 'object' ? args[2].uri : args[2]
        if (_this._log) {
          _this._log.warn(
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

/**
 * Sends an HTTP GET request.
 * @param {string|object} options
 * @param {function} callback
 * @returns {request.Request}
 */
BasicAPI.prototype.get = function (options, callback) {
  return _exec(this, options, 'get', callback)
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
    if (params.hasOwnProperty(key)) {
      const value = params[key]
      myUri = uri.replace(new RegExp(':' + key, 'gi'), encodeURIComponent(value))
    }
  }

  return myUri
}

// <editor-fold desc="Helper functions">

function _getKey(api, options, method) {
  const prefix = api._redis.prefix ? api._redis.prefix + ':' : ''
  let query = ''
  if (options.qs) {
    if (typeof options.qs === 'string') {
      query += '?' + options.qs
    } else {
      query += '?' + querystring.stringify(options.qs)
    }
  }
  return prefix + method + ':' + _getURI(api, options) + query
}

function _getURI(api, options) {
  let uri = api._basePath

  if (typeof options === 'string') {
    uri += options
  } else {
    uri += options.uri
  }

  return uri
}

function _wrapCallback(api, options, method, callback) {
  return (error, result, body) => {
    if (error) {
      callback(error, result, body)
      return
    }

    if (api._hasRedis && result.statusCode >= 200 && result.statusCode < 400) {
      const key = _getKey(api, options, method)
      const value = JSON.stringify(result)

      let redisMaybeFnc = api._redis.client
      if (typeof api._redis.client === 'function') {
        const { clientName, clientOptions } = api._redis
        if (clientName == null && clientOptions == null) {
          redisMaybeFnc = api._redis.client()
        } else {
          redisMaybeFnc = api._redis.client(clientName || 'default', clientOptions || null)
        }
      }

      Promise.resolve(redisMaybeFnc)
        .then(client => {
          client.set(key, value, (err, res) => {
            if (err) {
              callback(err)
            }
          })
          client.expire(key, api._redis.expire || 300, (err, res) => {
            if (err) callback(err)
          })
        })
        .catch(err => {
          callback(err)
        })
    }

    callback(error, result, body)
  }
}

function _exec(api, options, method, callback) {
  if (api._hasRedis && options.useCache) {
    const key = _getKey(api, options, method)

    const redisMaybeFnc = typeof api._redis.client === 'function' ? api._redis.client() : api._redis.client

    Promise.resolve(redisMaybeFnc)
      .then(
        client =>
          new Promise((resolve, reject) => {
            client.get(key, (err, reply) => {
              if (err || !reply) {
                reject(err)
              } else {
                // TODO: Should we catch parse errors and return a reasonable message or
                // is this good enough?
                const value = JSON.parse(reply)
                resolve(callback(null, value, value.body))
              }
            })
          })
      )
      .catch(() => _makeRequest(api, options, method, callback))
  } else {
    _makeRequest(api, options, method, callback)
  }
}

function _makeRequest(api, options, method, callback) {
  const uri = _getURI(api, options)
  let opts
  if (typeof options === 'string') {
    opts = {
      uri,
      requestGuid: uuidv4(),
      headers: {},
    }
  } else {
    opts = { headers: {}, requestGuid: uuidv4(), ...options, uri }
  }
  opts.headers[REQUEST_GUID] = opts.requestGuid
  api.lastRequestGuid = opts.requestGuid
  const cb = _wrapCallback(api, opts, method, callback)
  return api._request[method](opts, cb)
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

function _toBaseUrl(parts) {
  const protocol = parts.protocol || (parts.https ? 'https:' : 'http:')
  let host = parts.host || parts.hostname || 'localhost'
  let { port } = parts

  if (!port) {
    const portIndex = host.lastIndexOf(':')

    if (portIndex >= 0) {
      port = host.substr(portIndex + 1)
      host = host.substring(0, portIndex)
    }
  }

  if (!port) {
    return url.format({
      protocol,
      host,
    })
  }

  return url.format({
    protocol,
    hostname: host,
    port,
  })
}

// </editor-fold>

module.exports = BasicAPI
