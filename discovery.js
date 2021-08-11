/**
 * Class to handle OpenIDConnect discovery through .well-known
 */
var api = require('./api')
var url = require('url')

module.exports = (function () {
  /**
   * Factory function to hide class instantiation.
   *
   * @param config the configuration object
   * @returns {Discovery}
   */
  function factory(config) {
    return new Discovery(config)
  }

  /**
   * Discovery class constructor.
   *
   * @param config the configuration object. Must contain host and path.
   * @constructor
   */
  function Discovery(config) {
    this.config = config || {}
  }

  /**
   * Method to run OpenIDConnect discovery.
   * @param onDiscovered callback on when discovery was successful
   * @param onError callback on when error occurred during discovery
   */
  Discovery.prototype.discover = function (onDiscovered, onError) {
    // Begin by fetching data from the discovery endpoint
    getDiscoveryData(
      this.config,
      function (discoveryData) {
        if (!discoveryData.jwks_uri) {
          onError('jwkEndpoint missing from OIDC discovery data')
        }

        // If discovery went OK, fetch the jwk endpoint data
        getJwkData(
          discoveryData.jwks_uri,
          function (jwkData) {
            onDiscovered(discoveryData, jwkData)
          },
          function (err) {
            onError(err)
          }
        )
      },
      function (err) {
        onError(err)
      }
    )
  }

  /**
   * Makes an API call to the OpenIDConnect providers discovery endpoint and
   * fetches the data as json.
   * @param config the Discovery class configuration
   * @param onSuccess callback for when discovery fetching is successful
   * @param onError callback for when an error occurs during discovery fetching
   */
  function getDiscoveryData(config, onSuccess, onError) {
    var discoveryApi = api({
      host: config.host,
      path: config.path,
    })
    discoveryApi.request(onSuccess, onError)
  }

  /**
   * Makes an API call to the jwk_endpoint on the OpenIDConnect provider.
   *
   * @param jwksUri the uri for the jwk_endpoint (complete with host and path)
   * @param onSuccess callback for when jwk endpoint fetching was successful
   * @param onError callback for when an error occurs during jwk endpoint fetching
   */
  function getJwkData(jwksUri, onSuccess, onError) {
    var parsedJwkEndpoint = url.parse(jwksUri)
    var jwkDiscovery = api({
      host: parsedJwkEndpoint.host,
      path: parsedJwkEndpoint.pathname,
    })

    jwkDiscovery.request(onSuccess, onError)
  }

  /**
   * Module exposes the factory method.
   */
  return factory
})()
