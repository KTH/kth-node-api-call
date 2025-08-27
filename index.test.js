const apiCall = require('./index')

describe('Package "@kth/api-call"', () => {
  it(`has all the expected exports`, () => {
    expect(typeof apiCall.BasicAPI).toBe('function')
    expect(typeof apiCall.Connections).toBe('object')
    expect(typeof apiCall.Connections.setup).toBe('function')
  })
})
