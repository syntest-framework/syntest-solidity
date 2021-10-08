# SynTest Framework - Solidity

[![](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml/badge.svg)](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml)

SynTest Solidity is a tool for automatically generating test cases for the Solidity platform. This tool is part of the [SynTest Framework](https://www.syntest.org). This framework contains multiple tools related to the generation of synthetic tests.

### Overview

The common core contains the common interfaces for the code control-flow representation, test case structure, genes, and the implementation for the meta-heuristic search algorithms.

## Installation

### NPM

The simplest way to use syntest-solidity is by installing the [npm package](https://www.npmjs.com/package/syntest/solidity).

```bash
$ npm install @syntest/solidity
```

### From source

Until this happens, the tool can be used by cloning the project, installing its dependencies, and compiling the TypeScript:

- Clone the projects

```bash
$ git clone git@github.com:syntest-framework/syntest-solidity.git
```

- Install dependencies

```bash
$ cd syntest-solidity; npm install
```

- Build Syntest-Solidity

```bash
$ cd syntest-solidity; npm run build
```

## Usage

#### Standalone

```bash
$ syntest-solidity [options]
```

#### As a truffle plugin

To run syntest-solidity as a plugin of the truffle testing library, you need to create a truffle-config.js with the following contents:

```js
module.exports = {
  test_directory: ".syntest/tests",
  plugins: ["syntest-solidity"],
};
```

This file is auto-generated when using the standalone tool.

```bash
$ truffle run syntest-solidity [options]
```

## Documentation

For questions and help with how to use this tool, please see the [documentation](https://www.syntest.org).

## Support

For questions and help with how to use this library, please see [SUPPORT.md](SUPPORT.md).

## Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you would like to change. For more information, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Authors and acknowledgment

- Annibale Panichella (PI)
- Mitchell Olsthoorn (Project Lead)
- Dimitri Stallenberg (Developer)

## License

The content of this project itself is licensed under the [MIT license](LICENSE.md).
