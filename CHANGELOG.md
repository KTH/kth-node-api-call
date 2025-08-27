# Changelog

All notable changes for major version updates will be documented here.

## 4.3.0

### Changed

Will fail and exit on statup if an unsupported "redis" instance is passed.

### Removed

Exports for classes "cachedApi" and "oidcApi" are removed. According to searches on KTH organization on Github, these were never used.
Any files that seems to be unused will generate warnings on import, and will later be removed.

## 4.0.0

Name change kth-node-api-call -> @kth/api-call

Using node-fetch instead of deprecated request module.
