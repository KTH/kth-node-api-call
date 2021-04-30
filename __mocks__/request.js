const request = jest.fn()

request.get = jest.fn()
request.defaults = jest.fn(() => request)

module.exports = request
