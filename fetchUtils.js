/* eslint-disable no-console */
const fetch = require('node-fetch')
const urlJoin = require('url-join')
const FormData = require('form-data')

const MIME_JSON = 'application/json'
const MIME_TEXT = 'text/'
const MIME_SVG = 'image/svg+xml'
const HEADER_CONTENT_LENGTH = 'content-length'
const HEADER_CONTENT_TYPE = 'content-type'

function removeUndefined(obj) {
  const returnObj = Object.keys(obj).reduce((acc, key) => {
    if (obj[key] === undefined) {
      return acc
    }
    acc[key] = obj[key]
    return acc
  }, {})
  return returnObj
}

async function _parseResponseBody(response, json) {
  const contentLength = response.headers.get(HEADER_CONTENT_LENGTH)
  const contentType = response.headers.get(HEADER_CONTENT_TYPE)
  if (contentLength === '0') {
    return response.text()
  }
  if (contentType?.includes(MIME_JSON)) {
    return response.json()
  }
  if (contentType?.includes(MIME_SVG)) {
    return response.text()
  }
  if (contentType?.includes(MIME_TEXT)) {
    return response.text()
  }
  return response.buffer()
}
function buildFormData(data) {
  const form = new FormData()

  for (const key in data) {
    if (key === 'file') {
      form.append(key, data[key].value, data[key].options)
    } else {
      form.append(key, data[key])
    }
  }
  return form
}

function _createFetchWrapper(wrapperOptions, method) {
  const { baseUrl = '', headers = {}, json = true } = wrapperOptions
  return async (options, callback) => {
    const { uri } = options

    const target = urlJoin(baseUrl, uri)
    let opts
    if (options.formData) {
      opts = {}
      opts.method = method
      const form = buildFormData(options.formData)
      opts.body = form
      opts.headers = { ...headers, ...options.headers, ...form.getHeaders() }
    } else if (json) {
      opts = { ...options }
      opts.method = method
      opts.headers = { ...headers, ...options.headers }
      opts.headers[HEADER_CONTENT_TYPE] = MIME_JSON
      opts.body = JSON.stringify(opts.body)
    }

    try {
      const response = await fetch(target, opts)
      const responseBody = method === 'HEAD' ? undefined : await _parseResponseBody(response, json)
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
 *     Alternatively pass options to the querystring.stringify method using this format {sep:';', eq:':', options:{}}.
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
  const { url, qs = {}, method, json, body, headers } = options

  const queryObj = removeUndefined(qs)

  if (json) {
    headers[HEADER_CONTENT_TYPE] = MIME_JSON
  }

  const queryStr = new URLSearchParams(queryObj).toString()
  const fetchUrl = queryStr ? urlJoin(url, '?' + queryStr) : url

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
    put: _createFetchWrapper(wrapperOptions, 'PUT'),
    del: _createFetchWrapper(wrapperOptions, 'DELETE'),
    head: _createFetchWrapper(wrapperOptions, 'HEAD'),
    patch: _createFetchWrapper(wrapperOptions, 'PATCH'),
  }
}

module.exports = {
  fetchWrapper,
  fetchWrappers,
  removeUndefined,
}
