/**
 * @param {*} input
 * @returns {*}
 */
function listAllMockupCalls(input) {
  const _recursion = (obj, path) => {
    if (Array.isArray(obj)) {
      return obj.map((item, index) => _recursion(item, `${path}[${index}]`))
    }
  }

  return _recursion(input, '')
}

module.exports = {
  listMockupCalls,
}
