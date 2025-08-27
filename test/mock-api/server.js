/* eslint-disable no-console */

'use strict'

const express = require('express')
const formData = require('express-form-data')
const bodyParser = require('body-parser')
const config = require('./config')

module.exports = async () => {
  const app = express()

  app.use(formData.parse())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  config.paths.forEach(path => {
    // console.log('Added path', path.url)
    app[path.method](path.url, (req, res) => {
      // console.log('Responded on path', path.url)
      const { statusCode, body } = path.response(req, res)
      res.status(statusCode).send(body)
    })
  })

  const server = app.listen(config.host.port, config.host.address)

  app.get('/api/test/goodbye', (req, res) => {
    setTimeout(() => {
      server.close()
    }, 500)
    res.status(200).send({ status: 'Shutdown' })
  })
  app.use((req, res) => {
    // console.log('Caught request on path', req.url)
    res.status(404).send('')
  })
}
