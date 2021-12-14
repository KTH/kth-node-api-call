/* eslint-disable no-console */
const fetch = require('node-fetch')

async function _parseResponseBody(response, json) {
  const contentLength = response.headers.get('content-length')
  if (contentLength === '0') {
    return response.text()
  }
  return json ? response.json() : response.text()
}

function _createFetchWrapper(wrapperOptions, method) {
  const { baseUrl = '', headers = {}, json = true } = wrapperOptions
  return async (options, callback) => {
    const { uri, ...opts } = options

    const target = `${baseUrl}${uri}`
    opts.method = method
    opts.headers = { ...headers, ...opts.headers }
    if (json) {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(opts.body)
    }

    try {
      const response = await fetch(target, opts)
      const responseBody = await _parseResponseBody(response, json)
      response.statusCode = response.status
      callback(null, response, responseBody)
    } catch (error) {
      callback(error)
    }
  }
}

/**
 * Fetch wrapper. Should mimic previous use of request(options, callback).
 *
 * Options are:
 *   url:
 *     (Description in request)
 *     Fully qualified uri or a parsed url object from url.parse().
 *
 *     Value is created from Api options: 'https', 'host', 'port', and 'path'.
 *
 *   qs:
 *     (Description in request)
 *     Object containing querystring values to be appended to the uri.
 *
 *     Value from Api option 'query'. Default is {}.
 *
 *   qsStringifyOptions:
 *     (Description in request)
 *     Object containing options to pass to the qs.stringify method.
 *     Alternatively pass options to Pthe querystring.stringify method using this format {sep:';', eq:':', options:{}}.
 *     For example, to change the way arrays are converted to query strings using the qs module
 *     pass the arrayFormat option with one of indices|brackets|repeat
 *
 *     Value from Api option 'qsOptions' Default is { arrayFormat: 'brackets' }. Deprecated.
 *
 *   method:
 *     (Description in request)
 *     http method (default: "GET")
 *
 *     Value from Api option 'method'. Default is 'GET'.
 *
 *   json:
 *     (Description in request)
 *     Sets body to JSON representation of value and adds Content-type: application/json header.
 *     Additionally, parses the response body as JSON.
 *
 *     Value from Api option 'json'. Default value is true.
 *
 *   body:
 *     (Description in request)
 *     Entity body for PATCH, POST and PUT requests. Must be a Buffer, String or ReadStream.
 *     If json is true, then body must be a JSON-serializable object.
 *
 *     Value from Api option 'data', through JSON.stringify.
 *
 *   headers:
 *     (Description in request)
 *     http headers (default: {})
 *
 *     Value from Api option 'headers'. Default value is {}.
 *
 *   encoding:
 *     (Description in request)
 *     Encoding to be used on setEncoding of response data. If null, the body is returned as a Buffer.
 *     Anything else (including the default value of undefined) will be passed as the encoding parameter to toString() (meaning this is effectively utf8 by default).
 *     (Note: if you expect binary data, you should set encoding: null.)
 *
 *     Value from Api option 'encoding'. Default value is 'utf8'. Deprecated.
 *
 * @param {object} options Options formerly passed to request
 * @param {function} callback  Callback formerly passed to request
 */
async function fetchWrapper(options, callback) {
  const { url, qs, method, json, body, headers } = options

  if (json) {
    headers['Content-Type'] = 'application/json'
  }

  const fetchUrl = Object.keys(qs).length === 0 ? url : `${url}?${new URLSearchParams(qs).toString()}`

  const fetchOptions = {
    method,
    headers,
    body,
  }

  try {
    const response = await fetch(fetchUrl, fetchOptions)
    const responseBody = await _parseResponseBody(response, json)
    response.statusCode = response.status
    callback(null, response, responseBody)
  } catch (error) {
    callback(error)
  }
}

/**
 * Fetch wrappers with provided options. Should mimic previous use of request.defaults(options).
 *
 * Wrapper options are:
 *  baseUrl: Used to prefix all calls
 *  headers: Passed on to call header
 *  json: (from request) Sets body to JSON representation of value and adds Content-type: application/json header. Additionally, parses the response body as JSON.
 *  pool: Not implemented. Since Node 12 maxSockets are Infinity. (See https://nodejs.org/dist/v0.12.0/docs/api/http.html#http_agent_maxsockets)
 *
 * @param {object} wrapperOptions Options formerly passed to request.defaults
 * @returns Wrapped fetch with options
 */
function fetchWrappers(wrapperOptions = {}) {
  return {
    get: _createFetchWrapper(wrapperOptions, 'GET'),
    post: _createFetchWrapper(wrapperOptions, 'POST'),
  }
}

module.exports = {
  fetchWrapper,
  fetchWrappers,
}
