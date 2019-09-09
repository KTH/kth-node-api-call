/* eslint-env mocha */

const expect = require("chai").expect;
const redis = require("redis-mock");
const redisClient = redis.createClient();
const sinon = require("sinon");

const nock = require("nock");

const mockAPI = nock("http://localhost:3001")
  .get("/api/test/_paths")
  .reply(200, {})
  .get("/api/test/_checkAPIkey")
  .reply(401, {});

const mockApiConfig = {
  testApi: {
    https: false,
    port: 3001,
    host: "localhost",
    proxyBasePath: "/api/test",
    required: true
  }
};

const mockApiKeyConfig = {
  testApi: "1234"
};
const mockLogger = {};
mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = () => {};
// mockLogger.debug = mockLogger.error = mockLogger.warn = mockLogger.info = console.log

const opts = {
  log: mockLogger,
  redis: function() {
    return Promise.resolve(redisClient);
  },
  timeout: 100,
  cache: {
    testApi: mockApiConfig
  },
  checkAPIs: true // performs api-key checks against the apis, if a 'required' check fails, the app will exit. Required apis are specified in the config
};

const optsRetry = {
  log: mockLogger,
  redis: function() {
    return Promise.resolve(redisClient);
  },
  timeout: 100,
  cache: {
    testApi: mockApiConfig
  },
  checkAPIs: true,
  retryOnESOCKETTIMEDOUT: true
};

const connections = require("../connections");

describe("Testing api", function() {
  it("should shut down on bad API key", function(done) {
    this.originalProcess = process.exit;
    Object.defineProperty(process, "exit", {
      // mocking out process globally
      value: sinon.spy()
    });
    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts);
    setTimeout(function() {
      expect(process.exit.called).to.be.true;
      done();
    }, 500); // wait for setup to finish
  });

  it("should set up connections", function(done) {
    Object.defineProperty(process, "exit", {
      // undo previous exit override
      value: this.originalProcess
    });
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {});
    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts);
    setTimeout(function() {
      expect(output.testApi.connected).to.be.true;
      done();
    }, 500); // wait for setup to finish
  });

  it("should retry the api connection if it doesn't gets a bad status code response", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(503, {
        message: "Service Unavailable"
      })
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {});
    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts);
    setTimeout(function() {
      expect(output.testApi.connected).to.be.true;
      done();
    }, 500); // wait for setup to finish
  });

  it("should retry GET,POST,PUT,DELETE,PATCH,HEAD call on ESOCKETTIMEDOUT", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {})
      .get("/api/test/error")
      .times(6)
      .replyWithError({ message: "ESOCKETTIMEDOUT" })
      .put("/api/test/error")
      .times(6)
      .replyWithError("ESOCKETTIMEDOUT")
      .post("/api/test/error")
      .times(6)
      .replyWithError("ESOCKETTIMEDOUT")
      .delete("/api/test/error")
      .times(6)
      .replyWithError("ESOCKETTIMEDOUT")
      .patch("/api/test/error")
      .times(6)
      .replyWithError("ESOCKETTIMEDOUT")
      .head("/api/test/error")
      .times(6)
      .replyWithError("ESOCKETTIMEDOUT");

    const output = connections.setup(
      mockApiConfig,
      mockApiKeyConfig,
      optsRetry
    );

    setTimeout(function() {
      const client = output.testApi.client;
      client.getAsync("/api/test/error").catch(e => {
        expect(e.message).to.equal(
          "The request timed out after 5 retries. The connection to the API seems to be overloaded."
        );
        client.putAsync("/api/test/error").catch(e => {
          expect(e.message).to.equal(
            "The request timed out after 5 retries. The connection to the API seems to be overloaded."
          );
          client.postAsync("/api/test/error").catch(e => {
            expect(e.message).to.equal(
              "The request timed out after 5 retries. The connection to the API seems to be overloaded."
            );
            client.delAsync("/api/test/error").catch(e => {
              expect(e.message).to.equal(
                "The request timed out after 5 retries. The connection to the API seems to be overloaded."
              );
              client.patchAsync("/api/test/error").catch(e => {
                expect(e.message).to.equal(
                  "The request timed out after 5 retries. The connection to the API seems to be overloaded."
                );
                client.headAsync("/api/test/error").catch(e => {
                  expect(e.message).to.equal(
                    "The request timed out after 5 retries. The connection to the API seems to be overloaded."
                  );
                  done();
                });
              });
            });
          });
        });
      });
    }, 500); // wait for setup to finish
  });

  it("should retry GET,POST,PUT,DELETE,PATCH,HEAD call on ETIMEDOUT", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {})
      .get("/api/test/error")
      .times(6)
      .replyWithError({ message: "ETIMEDOUT" })
      .put("/api/test/error")
      .times(6)
      .replyWithError("ETIMEDOUT")
      .post("/api/test/error")
      .times(6)
      .replyWithError("ETIMEDOUT")
      .delete("/api/test/error")
      .times(6)
      .replyWithError("ETIMEDOUT")
      .patch("/api/test/error")
      .times(6)
      .replyWithError("ETIMEDOUT")
      .head("/api/test/error")
      .times(6)
      .replyWithError("ETIMEDOUT");

    const output = connections.setup(
      mockApiConfig,
      mockApiKeyConfig,
      optsRetry
    );

    setTimeout(function() {
      const client = output.testApi.client;
      client.getAsync("/api/test/error").catch(e => {
        expect(e.message).to.equal(
          "The request timed out after 5 retries. The connection to the API seems to be overloaded."
        );
        client.putAsync("/api/test/error").catch(e => {
          expect(e.message).to.equal(
            "The request timed out after 5 retries. The connection to the API seems to be overloaded."
          );
          client.postAsync("/api/test/error").catch(e => {
            expect(e.message).to.equal(
              "The request timed out after 5 retries. The connection to the API seems to be overloaded."
            );
            client.delAsync("/api/test/error").catch(e => {
              expect(e.message).to.equal(
                "The request timed out after 5 retries. The connection to the API seems to be overloaded."
              );
              client.patchAsync("/api/test/error").catch(e => {
                expect(e.message).to.equal(
                  "The request timed out after 5 retries. The connection to the API seems to be overloaded."
                );
                client.headAsync("/api/test/error").catch(e => {
                  expect(e.message).to.equal(
                    "The request timed out after 5 retries. The connection to the API seems to be overloaded."
                  );
                  done();
                });
              });
            });
          });
        });
      });
    }, 500); // wait for setup to finish
  });

  it("should retry GET,POST,PUT,DELETE,PATCH,HEAD call 10 times on ESOCKETTIMEDOUT", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {})
      .get("/api/test/error")
      .times(11)
      .replyWithError({ message: "ESOCKETTIMEDOUT" })
      .put("/api/test/error")
      .times(11)
      .replyWithError("ESOCKETTIMEDOUT")
      .post("/api/test/error")
      .times(11)
      .replyWithError("ESOCKETTIMEDOUT")
      .delete("/api/test/error")
      .times(11)
      .replyWithError("ESOCKETTIMEDOUT")
      .patch("/api/test/error")
      .times(11)
      .replyWithError("ESOCKETTIMEDOUT")
      .head("/api/test/error")
      .times(11)
      .replyWithError("ESOCKETTIMEDOUT");

    const output = connections.setup(
      mockApiConfig,
      mockApiKeyConfig,
      Object.assign(optsRetry, { maxNumberOfRetries: 10 })
    );

    setTimeout(function() {
      const client = output.testApi.client;
      client.getAsync("/api/test/error").catch(e => {
        expect(e.message).to.equal(
          "The request timed out after 10 retries. The connection to the API seems to be overloaded."
        );
        client.putAsync("/api/test/error").catch(e => {
          expect(e.message).to.equal(
            "The request timed out after 10 retries. The connection to the API seems to be overloaded."
          );
          client.postAsync("/api/test/error").catch(e => {
            expect(e.message).to.equal(
              "The request timed out after 10 retries. The connection to the API seems to be overloaded."
            );
            client.delAsync("/api/test/error").catch(e => {
              expect(e.message).to.equal(
                "The request timed out after 10 retries. The connection to the API seems to be overloaded."
              );
              client.patchAsync("/api/test/error").catch(e => {
                expect(e.message).to.equal(
                  "The request timed out after 10 retries. The connection to the API seems to be overloaded."
                );
                client.headAsync("/api/test/error").catch(e => {
                  expect(e.message).to.equal(
                    "The request timed out after 10 retries. The connection to the API seems to be overloaded."
                  );
                  done();
                });
              });
            });
          });
        });
      });
    }, 500); // wait for setup to finish
  });

  it("should retry GET,POST,PUT,DELETE,PATCH,HEAD call 10 times on ETIMEDOUT", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {})
      .get("/api/test/error")
      .times(11)
      .replyWithError({ message: "ETIMEDOUT" })
      .put("/api/test/error")
      .times(11)
      .replyWithError("ETIMEDOUT")
      .post("/api/test/error")
      .times(11)
      .replyWithError("ETIMEDOUT")
      .delete("/api/test/error")
      .times(11)
      .replyWithError("ETIMEDOUT")
      .patch("/api/test/error")
      .times(11)
      .replyWithError("ETIMEDOUT")
      .head("/api/test/error")
      .times(11)
      .replyWithError("ETIMEDOUT");

    const output = connections.setup(
      mockApiConfig,
      mockApiKeyConfig,
      Object.assign(optsRetry, { maxNumberOfRetries: 10 })
    );

    setTimeout(function() {
      const client = output.testApi.client;
      client.getAsync("/api/test/error").catch(e => {
        expect(e.message).to.equal(
          "The request timed out after 10 retries. The connection to the API seems to be overloaded."
        );
        client.putAsync("/api/test/error").catch(e => {
          expect(e.message).to.equal(
            "The request timed out after 10 retries. The connection to the API seems to be overloaded."
          );
          client.postAsync("/api/test/error").catch(e => {
            expect(e.message).to.equal(
              "The request timed out after 10 retries. The connection to the API seems to be overloaded."
            );
            client.delAsync("/api/test/error").catch(e => {
              expect(e.message).to.equal(
                "The request timed out after 10 retries. The connection to the API seems to be overloaded."
              );
              client.patchAsync("/api/test/error").catch(e => {
                expect(e.message).to.equal(
                  "The request timed out after 10 retries. The connection to the API seems to be overloaded."
                );
                client.headAsync("/api/test/error").catch(e => {
                  expect(e.message).to.equal(
                    "The request timed out after 10 retries. The connection to the API seems to be overloaded."
                  );
                  done();
                });
              });
            });
          });
        });
      });
    }, 500); // wait for setup to finish
  });

  it("should fail GET,POST,PUT,DELETE,PATCH,HEAD call on ESOCKETTIMEDOUT", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {})
      .get("/api/test/error")
      .replyWithError({ message: "ESOCKETTIMEDOUT" })
      .put("/api/test/error")
      .replyWithError("ESOCKETTIMEDOUT")
      .post("/api/test/error")
      .replyWithError("ESOCKETTIMEDOUT")
      .delete("/api/test/error")
      .replyWithError("ESOCKETTIMEDOUT")
      .patch("/api/test/error")
      .replyWithError("ESOCKETTIMEDOUT")
      .head("/api/test/error")
      .replyWithError("ESOCKETTIMEDOUT");

    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts);

    setTimeout(function() {
      const client = output.testApi.client;
      client.getAsync("/api/test/error").catch(e => {
        expect(e.message).to.equal("ESOCKETTIMEDOUT");
        client.putAsync("/api/test/error").catch(e => {
          expect(e.message).to.equal("ESOCKETTIMEDOUT");
          client.postAsync("/api/test/error").catch(e => {
            expect(e.message).to.equal("ESOCKETTIMEDOUT");
            client.delAsync("/api/test/error").catch(e => {
              expect(e.message).to.equal("ESOCKETTIMEDOUT");
              client.patchAsync("/api/test/error").catch(e => {
                expect(e.message).to.equal("ESOCKETTIMEDOUT");
                client.headAsync("/api/test/error").catch(e => {
                  expect(e.message).to.equal("ESOCKETTIMEDOUT");
                  done();
                });
              });
            });
          });
        });
      });
    }, 500); // wait for setup to finish
  });

  it("should fail GET,POST,PUT,DELETE,PATCH,HEAD call on ETIMEDOUT", function(done) {
    mockAPI
      .get("/api/test/_paths")
      .reply(200, {
        path1: {
          uri: "/api/test/v1/path1/:param1",
          method: "GET",
          apikey: {
            scope_required: true,
            scopes: ["read"],
            type: "api_key"
          }
        }
      })
      .get("/api/test/_checkAPIkey")
      .reply(200, {})
      .get("/api/test/error")
      .replyWithError({ message: "ETIMEDOUT" })
      .put("/api/test/error")
      .replyWithError("ETIMEDOUT")
      .post("/api/test/error")
      .replyWithError("ETIMEDOUT")
      .delete("/api/test/error")
      .replyWithError("ETIMEDOUT")
      .patch("/api/test/error")
      .replyWithError("ETIMEDOUT")
      .head("/api/test/error")
      .replyWithError("ETIMEDOUT");

    const output = connections.setup(mockApiConfig, mockApiKeyConfig, opts);

    setTimeout(function() {
      const client = output.testApi.client;
      client.getAsync("/api/test/error").catch(e => {
        expect(e.message).to.equal("ETIMEDOUT");
        client.putAsync("/api/test/error").catch(e => {
          expect(e.message).to.equal("ETIMEDOUT");
          client.postAsync("/api/test/error").catch(e => {
            expect(e.message).to.equal("ETIMEDOUT");
            client.delAsync("/api/test/error").catch(e => {
              expect(e.message).to.equal("ETIMEDOUT");
              client.patchAsync("/api/test/error").catch(e => {
                expect(e.message).to.equal("ETIMEDOUT");
                client.headAsync("/api/test/error").catch(e => {
                  expect(e.message).to.equal("ETIMEDOUT");
                  done();
                });
              });
            });
          });
        });
      });
    }, 500); // wait for setup to finish
  });
});
