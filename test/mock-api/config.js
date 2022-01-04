module.exports = {
  host: {
    address: '127.0.0.1',
    port: 3210,
  },
  paths: [
    {
      method: 'get',
      url: '/api/test/_paths',
      response: () => ({
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
      }),
    },

    {
      method: 'get',
      url: '/api/test/_checkAPIkey',
      response: () => ({ statusCode: 200, body: {} }),
    },
    {
      method: 'get',
      url: '/api/test/method',
      response: req => ({
        statusCode: 200,
        body: { method: 'get', query: req.query },
      }),
    },
    {
      method: 'post',
      url: '/api/test/method',
      response: req => ({
        statusCode: 200,
        body: { method: 'post', postdata: req.body },
      }),
    },
    {
      method: 'put',
      url: '/api/test/method',
      response: req => ({ statusCode: 200, body: { method: 'put', putdata: req.body } }),
    },
    {
      method: 'delete',
      url: '/api/test/method',
      response: () => ({ statusCode: 200, body: { method: 'del' } }),
    },
    {
      method: 'head',
      url: '/api/test/method',
      response: () => ({ statusCode: 200, body: null }),
    },
    {
      method: 'patch',
      url: '/api/test/method',
      response: () => ({ statusCode: 200, body: { method: 'patch' } }),
    },
    {
      method: 'get',
      url: '/api/test/apitest',
      response: req => ({
        statusCode: 200,
        body: req.headers.accept === 'application/json' ? { type: req.headers.accept } : req.headers.accept,
      }),
    },
    {
      method: 'post',
      url: '/api/test/apitest',
      response: req => ({
        statusCode: 200,
        body: req.body,
      }),
    },
  ],
}
