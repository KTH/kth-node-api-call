kth-api-call
============

Node module used to make JSON calls against APIs.

To use in your node project, add the following line to your package.json:

```javascript
"kth-api-call": "https://github.com/KTH/kth-api-call.git#version"
```

Where 'version' is a commit hash, tag or release.

To use:

```javascript
var api = require('kth-api-call');

var ApiCall = api(
  {
    host : 'www.examplehost.com',
    path : '/example/path'
  }
);

ApiCall.request(
  function(data) { 
    // Called on success
    // data is a JSON object with the response data
  }, 
  function(err) { 
    // Called on error
    // err contains the error message
  }
);
```

The configuration parameter sent to the module can consist of the following:

*  port : int / default: 443
*  method : string / default: GET
*  host : string / default: none / MANDATORY
*  path : string / default: '/'
*  debugMode : boolean / default: false
*  https : boolean / default: true
*  headers : object / default: undefined
*  json : boolean / default: false

## BasicAPI

This is a more straightforward wrapper around [request][request]. It will allow
more control but also encourage more code re-use. It allows the use of Promises
and caching (via redis) of successful responses (status >= 200 and status < 400).

For more details see the examples below and [the source code][basicjs].

```javascript
// configure this and re-use throughout your app

const api = new BasicAPI({
  hostname: 'localhost',
  port: 3001,
  json: true,
  https: false,
  headers: {
    'api_key': 'abcd'
  },
  // optionally enable redis for response caching
  // redis: {
  //   client: redisClient,
  //   prefix: 'node-api',
  //   expire: 120
  // }
})

// usage example:

const params = { id: 123 }
const uri = api.resolve('/value/:id', params)

// promise
api.getAsync(uri)
    .then((response) => {
      if (response.statusCode >= 200 && response.statusCode < 400) {
        // do something with response.body
      } else {
        // bad/unexpected status code, delegate error
      }
    })
    .catch((err) => {
      // handle/delegate err
    })

// or callback
api.get(uri, (err, response, body) => {
  if (err) {
    // handle/delegate err
    return
  }

  if (response.statusCode >= 200 && response.statusCode < 400) {
    // do something with response.body
  } else {
    // bad/unexpected status code, delegate error
  }
})
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
