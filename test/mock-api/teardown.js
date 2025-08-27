module.exports = async () => {
  // Shut down test api server
  await fetch('http://localhost:3210/api/test/goodbye')
}
