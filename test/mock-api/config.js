module.exports = {
  host: {
    address: '127.0.0.1',
    port: 3210,
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
      url: '/api/test/method',
      response: { statusCode: 200, body: { method: 'get' } },
    },
    {
      method: 'post',
      url: '/api/test/method',
      response: { statusCode: 200, body: { method: 'post' } },
    },
    {
      method: 'put',
      url: '/api/test/method',
      response: { statusCode: 200, body: { method: 'post' } },
    },
    {
      method: 'delete',
      url: '/api/test/method',
      response: { statusCode: 200, body: { method: 'del' } },
    },
    {
      method: 'head',
      url: '/api/test/method',
      response: { statusCode: 200, body: { method: 'head' } },
    },
    {
      method: 'patch',
      url: '/api/test/method',
      response: { statusCode: 200, body: { method: 'patch' } },
    },
  ],
}
