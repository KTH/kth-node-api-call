var api = require('./api')
var url = require('url')

module.exports = (function () {
  function factory (options) {
    return new TokenCall(options)
  }

  function TokenCall (options) {
    this.options = options || {}
    this.options.tokenEndpoint = options.tokenEndpoint
    this.options.clientKey = options.clientKey
    this.options.clientSecret = options.clientSecret
  }

  TokenCall.prototype.getClientToken = function (onSuccess, onError) {
    var parsedTokenUrl = url.parse(this.options.tokenEndpoint)
    var TokenApi = api({
      host: parsedTokenUrl.host,
      port: parsedTokenUrl.port,
      path: parsedTokenUrl.path,
      query: {
        grant_type: 'client_credential',
        client_id: this.options.clientKey,
        client_secret: this.options.clientSecret
      }
    })

    TokenApi.request(onSuccess, onError)
  }

  return factory
})()
