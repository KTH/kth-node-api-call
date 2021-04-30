const Global = {
  mockupProps: [],
}

function _getPropsOfJestMockupFunction() {
  if (Global.mockupProps.length === 0) {
    Global.mockupProps = Object.keys(jest.fn())
  }
  return Global.mockupProps
}

/**
 * @param {*} input
 * @param {object} [options]
 * @param {boolean} [options.replaceAllSpecials]
 * @param {boolean} [options.replaceFunctions]
 *
 * @returns {*}
 */
function copyObject(input, options) {
  const { replaceAllSpecials, replaceFunctions } = options || {}

  const _listFunctionProps = obj => {
    if (obj.mock != null && typeof obj.mock === 'object') {
      const mockupProps = _getPropsOfJestMockupFunction()
      return Object.keys(obj).filter(key => !mockupProps.includes(key))
    }
    return Object.keys(obj)
  }

  const _recursion = (obj, path) => {
    if (path.includes(obj)) {
      return '(circular)'
    }
    const _path = [...path, obj]

    if (Array.isArray(obj)) {
      return obj.map(item => _recursion(item, _path))
    }

    if (obj != null && typeof obj === 'object') {
      const result = {}
      Object.keys(obj).forEach(key => {
        result[key] = _recursion(obj[key], _path)
      })
      return result
    }

    if (typeof obj === 'function') {
      // if (obj.mock != null && typeof obj.mock === 'object') {
      //   if (replaceAllSpecials || replaceMockupCalls) {
      //     const l = obj.mock.calls.length
      //     const self = `(MOCK:${l} call${l === 1 ? '' : 's'})`

      //     const objProps = _listFunctionProps(obj)
      //     if (objProps.length === 0) {
      //       return self
      //     }
      //     const result = { _self: self, props: {} }
      //     objProps.forEach(key => {
      //       result.props[key] = _recursion(obj[key], _path)
      //     })
      //     return result
      //   }
      // }

      if (replaceAllSpecials || replaceFunctions) {
        let self
        if (obj.mock != null && typeof obj.mock === 'object') {
          const l = obj.mock.calls.length
          self = `(MOCK:${l} call${l === 1 ? '' : 's'})`
        } else {
          self = `(FUNC:${obj.name || 'anonymous'})`
        }

        const objProps = _listFunctionProps(obj)
        if (objProps.length === 0) {
          return self
        }
        const result = { _self: self, props: {} }
        objProps.forEach(key => {
          result.props[key] = _recursion(obj[key], _path)
        })
        return result
      }
    }

    return obj
  }

  return _recursion(input, [])
}

module.exports = {
  copyObject,
}
