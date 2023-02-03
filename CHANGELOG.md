# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

- Generated variable names: variable names cannot start with a number which made the test cases fail

### Security

## [0.2.1] - 2023-01-25

### Fixed

- Package build: npm build was not being called before publish

## [0.2.0] - 2023-01-18

### Added

- Solc compiler version picking through configuration
- Language specific parsing interfaces from the core

## [0.1.2] - 2021-11-29

### Fixed

- The help and version commands of the CLI were not working properly
- Removed the failing docker workflow

## [0.1.1] - 2021-10-22

### Fixed

- The execution binary was using the wrong Truffle plugin name
- The few JavaScript files in the project were not packaged

## [0.1.0] - 2021-10-18

### Added

- Solidity adapters for the different interfaces in the framework (e.g., test runner, static and dynamic analysis)
- Solidity test encoding
- Solidity instrumentation
- Solidity specific search criteria (i.e., probe coverage)

[unreleased]: https://github.com/syntest-framework/syntest-solidity/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/syntest-framework/syntest-solidity/releases/tag/v0.2.0...v0.2.1
[0.2.0]: https://github.com/syntest-framework/syntest-solidity/releases/tag/v0.1.2...v0.2.0
[0.1.2]: https://github.com/syntest-framework/syntest-solidity/releases/tag/v0.1.1...v0.1.2
[0.1.1]: https://github.com/syntest-framework/syntest-solidity/releases/tag/v0.1.0...v0.1.1
[0.1.0]: https://github.com/syntest-framework/syntest-solidity/releases/tag/v0.1.0
