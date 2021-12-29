/* eslint-disable func-names */
/* eslint-disable no-use-before-define */
/**
 * Class to handle json api calls
 * @type {*}
 */

const Q = require('q')
const { v4: uuidv4 } = require('uuid')
const { fetchWrapper } = require('./fetchUtils')

module.exports = (function () {
  const MIME_JSON = 'application/json'
  const MIME_TEXT = 'text/plain'
  const HEADER_ACCEPT = 'accept'
  const REQUEST_GUID = 'request-guid'

  /**
   * Wrap our constructor in a factory method.
   * @param options our options object
   * @returns {Api} a new instance of an Api class
   */
  function factory(options) {
    return new Api(options)
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
   *  encoding : string / default: 'utf8'
   * }
   * @constructor
   */
  function Api(apiOptions) {
    // default options
    const options = defaultOptions(apiOptions)

    this.debugMode = apiOptions.debugMode || false

    this.httpRequestSettings = {
      url: buildRequestUri(options),
      qs: options.query || {},
      qsStringifyOptions: options.qsOptions,
      method: options.method,
      json: options.json,
      body: JSON.stringify(options.data),
      headers: options.headers,
      encoding: options.encoding,
    }

    this.debugPrint = function (msg) {
      const self = this
      if (self.debugMode) {
        // eslint-disable-next-line no-console
        console.log(msg)
      }
    }
  }

  /**
   * Sends a GET request to the configured api expecting a JSON response
   *
   * @param onSuccess callback for success, receives the response json data as a parameter
   * @param onError callback for then call fails, receives the error as a parameter
   */
  Api.prototype.getJson = function (onSuccess, onError) {
    const self = this
    self.httpRequestSettings.headers[HEADER_ACCEPT] = MIME_JSON
    self.httpRequestSettings.headers[REQUEST_GUID] = options.requestGuid || uuidv4()
    self.httpRequestSettings.method = 'GET'

    self.request(onSuccess, onError)
  }

  /**
   * Sends a GET request to the configured api expecting a text/plain response
   *
   * @param onSuccess callback for success, receives the response text data as a parameter
   * @param onError callback for then call fails, receives the error as a parameter
   */
  Api.prototype.getText = function (onSuccess, onError) {
    const self = this
    self.json = false
    self.httpRequestSettings.headers[HEADER_ACCEPT] = MIME_TEXT
    self.httpRequestSettings.headers[REQUEST_GUID] = options.requestGuid || uuidv4()
    self.httpRequestSettings.method = 'GET'

    self.request(onSuccess, onError)
  }

  /**
   * Sends a POST request to the configured api, with a JSON payload
   *
   * @param data the payload to send to the server
   * @param onSuccess callback for success, receives the response json data as a parameter
   * @param onError callback for then call fails, receives the error as a parameter
   */
  Api.prototype.postJson = function (data, onSuccess, onError) {
    const self = this
    self.httpRequestSettings.json = true
    self.httpRequestSettings.method = 'POST'
    self.httpRequestSettings.body = data
    self.httpRequestSettings.headers[REQUEST_GUID] = options.requestGuid || uuidv4()

    self.request(onSuccess, onError)
  }

  /**
   * Sends a request to the configured api
   *
   * @param onSuccess callback for success, receives the response json data as a parameter
   * @param onError callback for then call fails, receives the error as a parameter
   */
  Api.prototype.request = function (onSuccess, onError) {
    const self = this

    self.debugPrint('GET Request settings: ' + JSON.stringify(self.httpRequestSettings))

    // handle response, i.e. call correct callback
    fetchWrapper(self.httpRequestSettings, handleResponse(self, onSuccess, onError))
  }

  /**
   * Sends a GET request to the configured api expecting a text/plain response
   */
  Api.prototype.promisedGetText = function () {
    const self = this
    self.json = false
    self.httpRequestSettings.headers[HEADER_ACCEPT] = MIME_TEXT
    self.httpRequestSettings.headers[REQUEST_GUID] = options.requestGuid || uuidv4()
    self.httpRequestSettings.method = 'GET'

    return self.promisedApiCall()
  }

  /**
   * Method returning api calls as promise.
   * The promise will be resolved with
   * - the error if call fails
   * - the response object/json
   * @return promise for the api call
   */
  Api.prototype.promisedApiCall = function () {
    const self = this

    const deferred = Q.defer()

    self.debugPrint('Deferred call: ' + JSON.stringify(self.httpRequestSettings))

    self.request(
      data => {
        deferred.resolve(data) // fulfills the promise with `data` as the value
      },
      err => {
        deferred.reject(err) // rejects the promise with `err` as the reason
      }
    )
    return deferred.promise // the promise is returned
  }

  // helper functions

  /**
   *
   */
  function defaultOptions(requestOptions) {
    const options = requestOptions || {}
    // default options
    options.port = requestOptions.port
    options.method = requestOptions.method || 'GET'
    options.path = requestOptions.path || '/'
    options.headers = requestOptions.headers || {}
    options.json = requestOptions.json || true
    options.qsOptions = requestOptions.qsOptions || { arrayFormat: 'brackets' }
    options.encoding = requestOptions.encoding || 'utf8'

    if (typeof requestOptions.https === 'undefined' || requestOptions.https) {
      options.https = true
    } else {
      options.https = false
    }

    options.headers = normalizeHeaders(options.headers)

    return options
  }

  /*
   * response handler wrapper function
   */
  function handleResponse(self, onSuccess, onError) {
    return function (error, response, body) {
      onError = onError || function () {}
      onSuccess = onSuccess || function () {}
      if (error) {
        onError(error)
        self.debugPrint('Error: ' + error)
      } else {
        // if status code is bad, return an error
        if (response.statusCode >= 400) {
          return onError({
            statusCode: response.statusCode,
            body: response.body,
          })
        }
        onSuccess(body)
        self.debugPrint('Response: ' + response.statusCode, body)
      }
    }
  }

  /*
   * build ther call uri
   */
  function buildRequestUri(options) {
    let requestUri = 'http://'
    if (options.https) {
      requestUri = 'https://'
    }

    requestUri += options.host

    if (options.port) {
      requestUri += ':' + options.port
    }
    requestUri += options.path

    return requestUri
  }

  /*
   * normalize headers, i.e. lower case all header names.
   */
  function normalizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') return {}

    const normalizedHeaders = {}
    for (const name in headers) {
      if (headers.hasOwnProperty(name)) {
        normalizedHeaders[name.toLowerCase()] = headers[name]
      }
    }

    return normalizedHeaders
  }

  return factory
})()
