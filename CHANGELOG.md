# Changelog

All notable changes for major version updates will be documented here.

## 4.3.1

### Bugfix

Issues with redis not reconnecting in 4.3.0

## 4.3.0

### Added

Redis operations will log errors instead of just failing silently

### Changed

Will fail and exit on statup if an unsupported "redis" instance is passed.

### Removed

Exports for classes "cachedApi" and "oidcApi" are removed. According to searches on KTH organization on Github, these were never used.
Any files that seems to be unused will generate warnings on import, and will later be removed.

## 4.0.0

Name change kth-node-api-call -> @kth/api-call

Using node-fetch instead of deprecated request module.
