module.exports = {
  host: {
    address: '127.0.0.1',
    port: 3001,
  },
  paths: [
    {
      method: 'get',
      url: '/api/test/_paths',
      response: {
        statusCode: 200,
        body: {
          path1: {
            uri: '/api/test/v1/path1/:param1',
            method: 'GET',
            apikey: {
              scope_required: true,
              scopes: ['read'],
              type: 'api_key',
            },
          },
        },
      },
    },

    {
      method: 'get',
      url: '/api/test/_checkAPIkey',
      response: { statusCode: 200, body: {} },
    },
    {
      method: 'get',
      url: '/api/test/error',
      response: null,
    },
  ],
}
