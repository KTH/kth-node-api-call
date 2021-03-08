# KTH Node API Call [![Build Status](https://travis-ci.org/kth/kth-node-api-call.svg?branch=master)](https://travis-ci.org/kth/kth-node-api-call)

# Overview

Node module used to make JSON calls against APIs.

To use in your node project, add the following line to your package.json:

```json
"kth-node-api-call": "https://github.com/KTH/kth-node-api-call.git#version"
```

Where 'version' is a commit hash, tag or release.

## Setup

In your init callback to the express web server, this should happen:

```javascript
const connections = require('kth-node-api-call').Connections

const nodeApi = {
  namedApi: {
    host: 'localhost', // api hostname
    https: false, // use ssl?
    port: 3001, // api port
    proxyBasePath: '/api/applicationName', // api base path
    required: true, // is the api required? Optional, defaults to false
    defaultTimeout: 2000, // milliseconds. Optional, defaults to 2000
    }
}

const cacheConfig = {
  namedApi: {
    redis: {
      host: 'localhost',
      port: 6379
    }
  }
}

const apiKey = {
  namedApi; '1234'
}

const options = {
  timeout: 5000, // milliseconds, retry interval if getting API-paths fails
  log: myLogger, // your logger instance
  redis: myRedis, // your redis instance
  cache: cacheConfig, // your api cache options
  checkAPIs: true
}
// either
module.exports = connections.setup(nodeApi, apiKey, options)
// or
const api = connections.setup(nodeApi, apiKey, options)
```

### Note

The checkAPIs option requires that the API implements a checkAPIkey route, see [node-api](https://www.github.com/KTH/node-api.git)
The endpoint can be overridden by setting the `statusCheckPath` property on the api config object

## Usage

Wherever you need to call your api, use something on the form of:

```javascript
const paths = api.namedApi.paths
const client = api.namedApi.client

// user is a uri parameter
client.getAsync(client.resolve(paths.[YOUR_ENDPOINT], {user: username, etc...}))
.then(response => {
  // do something with result
})

```

if you want to use a cached api, add the option `{useCache: true}` to the `getAsync` call like this:

```javascript
client.getAsync([FULL_PATH], { useCache: true }).then((response) => {
  // etc.
});
```

## BasicAPI

This is a more straightforward wrapper around [request][request]. It will allow
more control but also encourage more code re-use. It allows the use of Promises
and caching (via redis) of successful responses (status >= 200 and status < 400).

For more details see the examples below and [the source code][basicjs].

```javascript
// configure this and re-use throughout your app

const api = new BasicAPI({
  hostname: "localhost",
  port: 3001,
  json: true,
  https: false,
  headers: {
    api_key: "abcd",
  },
  // optionally enable redis for response caching
  // redis: {
  //   client: redisClient,
  //   prefix: 'node-api',
  //   expire: 120
  // }
});

// usage example:

const params = { id: 123 };
const uri = api.resolve("/value/:id", params);

// promise
api
  .getAsync(uri)
  .then((response) => {
    if (response.statusCode >= 200 && response.statusCode < 400) {
      // do something with response.body
    } else {
      // bad/unexpected status code, delegate error
    }
  })
  .catch((err) => {
    // handle/delegate err
  });

// or callback
api.get(uri, (err, response, body) => {
  if (err) {
    // handle/delegate err
    return;
  }

  if (response.statusCode >= 200 && response.statusCode < 400) {
    // do something with response.body
  } else {
    // bad/unexpected status code, delegate error
  }
});
```

### HTTP Request Methods

Each of the following sends a corresponding HTTP request.
Append `Async` (e.g. `getAsync`) to use Promise instead of callback.
The first parameter should be either a uri (as a string) or an
options object which is passed to [request][request]. For non-async
methods the second parameter should be a function with the following
signature: `function (error, response, body) { ... }`. The callback
parameters are the same as for the request library.

Note that if you use Redis and/or the async methods you might lose
some functionality. For details about this, read the source code!

- `get`/`getAsync`
- `post`/`postAsync`
- `put`/`putAsync`
- `del`/`delAsync`
- `head`/`headAsync`
- `patch`/`patchAsync`

### Utility Methods

- `resolve` takes two parameters. The first is a uri template, e.g.
  `/value/:name`, and the second is a plain object, e.g. `{ name: 'foo' }`.
  It will then replace `:name` with the matching values in the object,
  resolving the uri `/value/foo`.
- `jar` and `cookie` are basic wrapper to the corresponding [request][request]
  methods.
- `defaults` re-uses the same config and applies another configuration set on top.
  Basically it does the same as `request.defaults()` but returns a valid
  `BasicAPI` instance.

[request]: https://www.npmjs.com/package/request
[basicjs]: ./basic.js
