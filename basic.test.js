/* eslint-disable no-console */

const BasicAPI = require('./basic')
require('./test/mock-api/server')

const logConsole = false
const mockLogger = {
  debug: logConsole ? console.log : () => {},
  error: logConsole ? console.log : () => {},
  warn: logConsole ? console.log : () => {},
  info: logConsole ? console.log : () => {},
}

const opts = {
  hostname: '127.0.0.1',
  host: 'localhost',
  port: '3210',
  https: false,
  json: true,
  defaultTimeout: 50,
  retryOnESOCKETTIMEDOUT: true,
  maxNumberOfRetries: 2,
  basePath: '/api/test',
  log: mockLogger,
}

const api = BasicAPI(opts)

describe('basic calls works as expected', () => {
  it('performs a successful get request when calling get', done => {
    api.get('/method', (error, response, body) => {
      expect(body.method).toBe('get')
      expect(response.statusCode).toBe(200)
      done()
    })
  })
  it('performs a successful post request when calling post', done => {
    api.post({ uri: '/method', body: { test: true } }, (error, response, body) => {
      expect(body).toStrictEqual({ postdata: { test: true }, method: 'post' })
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful post request with formData when calling post', done => {
    api.post({ uri: '/method', formData: { test: 'formData' } }, (error, response, body) => {
      expect(body).toStrictEqual({ postdata: { test: 'formData' }, method: 'post' })
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful put request when calling put', done => {
    api.put('/method', (error, response, body) => {
      expect(body.method).toBe('put')
      expect(response.statusCode).toBe(200)
      done()
    })
  })
  it('performs a successful delete request when calling del', done => {
    api.del('/method', (error, response, body) => {
      expect(body.method).toBe('del')
      expect(response.statusCode).toBe(200)
      done()
    })
  })
  it('performs a successful patch request when calling patch', done => {
    api.patch('/method', (error, response, body) => {
      expect(body.method).toBe('patch')
      expect(response.statusCode).toBe(200)
      done()
    })
  })
  it('performs a successful head request when calling head', done => {
    api.head('/method', (error, response, body) => {
      expect(body).toBeUndefined()
      expect(response.statusCode).toBe(200)
      done()
    })
  })

  it('performs a successful get request when calling getAsync', async () => {
    const result = await api.getAsync('/method')
    expect(result.body.method).toBe('get')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful post request when calling postAsync', async () => {
    const result = await api.postAsync({ uri: '/method', body: { test: true } })
    expect(result.body).toStrictEqual({ postdata: { test: true }, method: 'post' })
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful post request with formData when calling postAsync', async () => {
    const result = await api.postAsync({ uri: '/method', formData: { test: 'formData' } })
    expect(result.body).toStrictEqual({ postdata: { test: 'formData' }, method: 'post' })
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful put request when calling putAsync', async () => {
    const result = await api.putAsync('/method')
    expect(result.body.method).toBe('put')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful delete request when calling delAsync', async () => {
    const result = await api.delAsync('/method')
    expect(result.body.method).toBe('del')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful patch request when calling patchAsync', async () => {
    const result = await api.patchAsync('/method')
    expect(result.body.method).toBe('patch')
    expect(result.statusCode).toBe(200)
  })
  it('performs a successful head request when calling headAsync', async () => {
    const result = await api.headAsync('/method')
    expect(result.body).toBeUndefined()
    expect(result.statusCode).toBe(200)
  })
  it('should retry on timeout', async () => {
    api._request.post = jest.fn().mockImplementation(async (options, callback) => {
      callback(new Error('ESOCKETTIMEDOUT'))
    })

    await api.postAsync('/timeout').catch(e => {
      expect(e.message).toContain('timed out after 2 retries. The connection to the API seems to be overloaded.')
      expect(api._request.post).toBeCalledTimes(3)
    })
  })

  afterAll(done => {
    api.getAsync('/goodbye')
    setTimeout(done, 500)
  })
})
