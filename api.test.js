/* eslint-disable no-console */
const api = require('./api')

const testApi = api({ https: false, host: 'localhost', port: '3210', path: '/api/test/apitest' })

describe('api calls works as expected', () => {
  it('performs a successful get request when calling getText', done => {
    testApi.getText(data => {
      expect(data).toBe('text/plain')
      done()
    })
  })
  it('performs a successful get request when calling getJson', done => {
    testApi.getJson(data => {
      expect(data.type).toBe('application/json')
      done()
    })
  })
  it('performs a successful post request when calling postJson', done => {
    testApi.postJson('{ "data": "test" }', data => {
      expect(data).toMatchObject({ data: 'test' })
      done()
    })
  })

  // Test promise based functions
  it('performs a successful get request when calling promisedGetText', async () => {
    const data = await testApi.promisedGetText()
    expect(data).toBe('text/plain')
  })
  it('performs a successful get request when calling promisedApiCall', async () => {
    const data = await testApi.promisedApiCall()
    expect(data).toBe('text/plain')
  })
})
