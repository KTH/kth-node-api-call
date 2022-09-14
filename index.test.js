const apiCall = require('./index')

const { copyObject } = require('./test-utils')

describe('Package "@kth/api-call"', () => {
  it(`has all the expected exports`, () => {
    const copy = copyObject(apiCall, { replaceFunctions: true })
    expect(copy).toMatchInlineSnapshot(`
      {
        "BasicAPI": "(FUNC:BasicAPI)",
        "Connections": {
          "setup": "(FUNC:setup)",
        },
        "cachedApi": "(FUNC:factory)",
        "oidcApi": "(FUNC:factory)",
      }
    `)
  })
})
