const api = require('../../api')

const apiShutdown = api({ https: false, host: 'localhost', port: '3210', path: '/api/test/goodbye' })

module.exports = async () => {
  // Shut down test api server
  await apiShutdown.promisedGetText()
}
