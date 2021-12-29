/* eslint-disable func-names */
const url = require('url')
const api = require('./api')

module.exports = (function () {
  function TokenCall(options) {
    this.options = options || {}
    this.options.tokenEndpoint = options.tokenEndpoint
    this.options.clientKey = options.clientKey
    this.options.clientSecret = options.clientSecret
  }

  function factory(options) {
    return new TokenCall(options)
  }
  TokenCall.prototype.getClientToken = function (onSuccess, onError) {
    const parsedTokenUrl = url.parse(this.options.tokenEndpoint)
    const TokenApi = api({
      host: parsedTokenUrl.host,
      port: parsedTokenUrl.port,
      path: parsedTokenUrl.path,
      query: {
        grant_type: 'client_credential',
        client_id: this.options.clientKey,
        client_secret: this.options.clientSecret,
      },
    })

    TokenApi.request(onSuccess, onError)
  }

  return factory
})()
