/* eslint-disable no-console */

'use strict'

const express = require('express')
const { GracefulShutdownManager } = require('@moebius/http-graceful-shutdown')
const config = require('./config')

const app = express()
config.paths.forEach(path => {
  // console.log('Added path', path.url)
  app[path.method](path.url, (req, res) => {
    // console.log('Responded on path', path.url)
    if (path.response) {
      res.status(path.response.statusCode).send(path.response.body)
    } else res.destroy(null)
  })
})

const server = app.listen(config.host.port, config.host.address)
const shutdownManager = new GracefulShutdownManager(server)

app.get('/api/test/goodbye', (req, res) => {
  setTimeout(() => {
    shutdownManager.terminate(() => {})
  }, 500)
  res.status(200).send({ status: 'Shutdown' })
})
app.use((req, res) => {
  // console.log('Caught request on path', req.url)
  res.status(404).send('')
})
