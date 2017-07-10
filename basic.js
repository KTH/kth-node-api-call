'use strict'

const request = require('request')
const querystring = require('querystring')
const url = require('url')

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
function BasicAPI (options, base) {
  if (!(this instanceof BasicAPI)) {
    return new BasicAPI(options, base)
  }

  options = options || {}

  if (base) {
    this._request = base._request.defaults(options)
    this._redis = base._redis
    this._hasRedis = base._hasRedis
    return
  }

  const opts = {
    baseUrl: _toBaseUrl(options),
    headers: options.headers,
    json: options.json
  }

  this._request = request.defaults(opts)
  this._redis = options.redis
  this._hasRedis = !!(this._redis && this._redis.client)
  this._basePath = options.basePath || ''
  this._defaultTimeout = options.defaultTimeout || 2000
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
  return _createPromise(this, this.patch, options)
}

/**
 * Creates a cookie to be passed to a jar.
 * @param {string} cookie
 * @returns {*}
 */
BasicAPI.prototype.cookie = function (cookie) {
  return this._request.cookie(cookie)
}

/**
 * Creates a jar that accepts cookies. The jar can then be
 * passed to a request.
 * @returns {*}
 */
BasicAPI.prototype.jar = function () {
  return this._request.jar()
}

/**
 * Using this request as base, create a new BasicAPI instance
 * passing the options directly into `request.defaults()`.
 * @param {object} options
 * @returns {BasicAPI}
 */
BasicAPI.prototype.defaults = function (options) {
  return new BasicAPI(options, this)
}

BasicAPI.prototype.resolve = function (uri, params) {
  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      const value = params[key]
      uri = uri.replace(new RegExp(':' + key, 'gi'), encodeURIComponent(value))
    }
  }

  return uri
}

// <editor-fold desc="Helper functions">

function _getKey (api, options, method) {
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

function _getURI (api, options) {
  let uri = api._basePath

  if (typeof options === 'string') {
    uri += options
  } else {
    uri += options.uri
  }

  return uri
}

function _wrapCallback (api, options, method, callback) {
  return (err, res, body) => {
    if (err) {
      callback(err, res, body)
      return
    }

    if (api._hasRedis && res.statusCode >= 200 && res.statusCode < 400) {
      const key = _getKey(api, options, method)
      const value = JSON.stringify(res)
      api._redis.client.set(key, value, (err, res) => { if (err) callback(err) })
      api._redis.client.expire(key, api._redis.expire || 300, (err, res) => { if (err) callback(err) })
    }

    callback(err, res, body)
  }
}

function _exec (api, options, method, callback) {
  if (api._hasRedis && options.useCache) {
    const key = _getKey(api, options, method)

    api._redis.client.get(key, (err, reply) => {
      if (err) {
        callback(err)
        return
      }

      if (!reply) {
        const uri = _getURI(api, options)

        if (typeof options === 'string') {
          options = {
            uri: uri
          }
        } else {
          options.uri = uri
        }

        callback = _wrapCallback(api, options, method, callback)
        api._request[ method ](options, callback)
        return
      }

      const value = JSON.parse(reply)
      callback(null, value, value.body)
    })

    return
  }

  const uri = _getURI(api, options)

  if (typeof options === 'string') {
    options = {
      uri: uri
    }
  } else {
    options.uri = uri
  }

  callback = _wrapCallback(api, options, method, callback)
  return api._request[ method ](options, callback)
}

function _createPromise (api, func, options) {
  // Create a options object so we can add default timeout
  if (typeof options !== 'object') {
    options = {uri: options}
  }

  // If no timeout was set on this specific call we add default timeout
  if (!options.timeout) {
    options.timeout = api._defaultTimeout
  }

  return new Promise((resolve, reject) => {
    func.call(api, options, _createPromiseCallback(resolve, reject))
  })
}

function _createPromiseCallback (resolve, reject) {
  return function (error, response, body) {
    if (error) {
      reject(error)
    } else {
      resolve({
        response: response,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        body: body
      })
    }
  }
}

function _toBaseUrl (parts) {
  const protocol = parts.protocol || (parts.https ? 'https:' : 'http:')
  let host = parts.host || parts.hostname || 'localhost'
  let port = parts.port

  if (!port) {
    const portIndex = host.lastIndexOf(':')

    if (portIndex >= 0) {
      port = host.substr(portIndex + 1)
      host = host.substring(0, portIndex)
    }
  }

  if (!port) {
    return url.format({
      protocol: protocol,
      host: host
    })
  }

  return url.format({
    protocol: protocol,
    hostname: host,
    port: port
  })
}

// </editor-fold>

module.exports = BasicAPI
