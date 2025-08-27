/* eslint-disable func-names */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
/**
 * Class to handle json api calls
 * @type {*}
 */

const https = require('https')
const http = require('http')
const discovery = require('./discovery')
const tokenCall = require('./tokenCall')

module.exports = (function () {
  console.warn('⚠️ @kth/api-call/oidcApi is deprecated and will be removed ⚠️')

  /**
   * Wrap our constructor in a factory method.
   * @param options our options object
   * @returns {Api} a new instance of an Api class
   */
  function factory() {
    return new Api()
  }

  /**
   * Constructor for the Api class
   * @param options the options object:
   * {
   *  port : int / default: 443
   *  method : string / default: GET
   *  host : string / default: none / MANDATORY
   *  path : string / default: ''
   *  debugMode : boolean / default: false
   *  https : boolean / default: true
   *  headers : object / default: undefined
   * }
   * @constructor
   */
  function Api() {}

  // Init the module instance
  Api.prototype.init = function (options, onSuccess, onError) {
    const self = this

    this.options = options || {}
    this.options.debugMode = options.debugMode || false
    this.options.oidcHost = options.oidcHost
    this.options.oidcPath = options.oidcPath
    this.options.clientKey = options.clientKey
    this.options.clientSecret = options.clientSecret
    this.options.loginUrl = options.loginUrl

    if (this.handleAuthentication) {
      const discoveryService = discovery({
        host: this.options.oidcHost,
        path: this.options.oidcPath,
        port: this.options.oidcPort,
      })

      discoveryService.discovery(
        discoveryData => {
          console.log('Discovery done')
          self.options.discoveryData = discoveryData
          onSuccess()
        },
        err => {
          onError(err)
        }
      )
    }
  }

  /**
   * Sends a request to the configured api
   *
   * @param onSuccess callback for success, recieves the response json data as a parameter
   * @param onError callback for then call fails, recieves the error as a parameter
   * @param originalRequest
   * @param originalResponse
   */
  Api.prototype.request = function (onSuccess, onError, originalRequest, originalResponse) {
    const self = this

    if (originalRequest.user) {
      self.requestOptions.headers.Authentication = 'Bearer ' + originalRequest.user
    }

    const requestOptions = {
      host: self.requestOptions.host,
      port: self.requestOptions.port,
      path: self.requestOptions.path,
      method: self.requestOptions.method,
      headers: self.requestOptions.headers,
    }

    self.debugPrint('Request settings: ' + JSON.stringify(requestOptions))

    const protocol = self.options.https ? https : http
    const apiRequest = protocol.request(
      requestOptions,
      _onResponse(onSuccess, onError, originalRequest, originalResponse, self)
    )

    apiRequest.end()

    apiRequest.on('error', err => {
      if (onError != null) {
        onError(err)
      }
    })
  }

  // Configure the next request
  Api.prototype.configureRequest = function (options) {
    this.requestOptions = options || {}
    this.requestOptions.port = options.port || 443
    this.requestOptions.method = options.method || 'GET'
    this.requestOptions.path = options.path || ''

    this.requestOptions.https = options.https || true

    this.debugPrint = function (msg) {
      if (this.requestOptions.debugMode) {
        console.log(msg)
      }
    }
  }

  /**
   * Wrapper function for handling response data.
   * The wrapping is done to allow the callback to http|https.request to
   * take more parameters than the original single 'response'.
   *
   * @param onSuccess success callback
   * @param onError error callback
   * @param self the prototype object
   * @returns {Function} a function pointer that can be used as a http|https.request callback
   * @private
   */
  function _onResponse(onSuccess, onError, originalRequest, originalResponse, self) {
    const err = onError || function () {}
    const succ = onSuccess || function () {}

    return function (response) {
      let responseData = ''

      response.on('data', data => {
        responseData += data
      })

      response.on('end', () => {
        self.debugPrint('Response from api: ' + responseData)
        _handleResponseFromApi(response, responseData, succ, err, originalRequest, originalResponse, self)

        /*        var json
         try {
         json = JSON.parse(responseData)
         } catch (err) {
         onError(err)
         }

         onSuccess(json); */
      })
    }
  }

  function _handleResponseFromApi(response, responseData, onSuccess, onError, originalRequest, originalResponse, self) {
    switch (response.statusCode) {
      case 401:
        // Unauthorized - token failed and no higher elevation is possible
        console.log('Unauthorized')
        onError({ error: '401 - Unauthorized. Token not valid for scope.' })
        break

      case 403:
        // Forbidden - token failed, try elevating authentication level
        console.log('Forbidden')
        originalResponse.redirect('/redirected/to/login/from/apicall?originalUrl=' + originalRequest.url)
        break

      case 412: {
        // Precondition failed - token was missing but should exist for resource
        console.log('Precondition failed')
        const TokenCall = tokenCall({
          clientKey: self.options.clientKey,
          clientSecret: self.options.clientSecret,
          tokenEndpoint: self.discoveryData.token_endpoint,
        })

        TokenCall.getClientToken(
          token => {
            console.log('Got client token')
            self.headers.Authentication = 'Bearer ' + token // eslint-disable-line no-param-reassign
            self.request(onSuccess, onError)
          },
          err => {
            onError({
              error: '500 - Internal server error. Error while fetching client access token: ' + err,
            })
          }
        )
        break
      }
      case 200:
        // Everything went fine
        console.log('200 OK')
        onSuccess(JSON.parse(responseData))
        break

      case 500:
        // Internal server error
        console.log('500 ISE')
        onError({
          error: '500 - Internal server error. Something went wrong. Response data: ' + responseData,
        })
        break

      case 400:
        // Bad request - wrong url?
        console.log('400 BR')
        onError({ error: '400 - Bad request. Wrong url?' })
        break

      default:
        console.log('Default')
        break
    }
  }

  return factory
})()
