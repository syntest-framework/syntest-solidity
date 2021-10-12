# SynTest Framework - Solidity

> The aim of this tool is make it easier for Solidity contract developers to test their contracts in a more effective and efficient way.

[![](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml/badge.svg)](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml)

### What is SynTest Solidity?

SynTest Solidity is a tool for automatically generating test cases for the Solidity platform. This tool is part of the [SynTest Framework](https://www.syntest.org). This framework contains multiple tools related to the generation of synthetic tests.

### Overview

The common core contains the common interfaces for the code control-flow representation, test case structure, genes, and the implementation for the meta-heuristic search algorithms.

## Installation

When the project reaches a stable state, a NPM package will be released. Until this happens, the tool can be used by cloning the project and the common framework, installing its dependencies, and compiling the TypeScript:

- Clone the projects

```bash
$ git clone git@github.com:syntest-framework/syntest-framework.git
$ git clone git@github.com:syntest-framework/syntest-solidity.git
```

- Install dependencies

```bash
$ cd syntest-framework; npm install
$ cd syntest-solidity; npm install
```

- Build Syntest-Solidity

```bash
$ cd syntest-framework; npm run build
$ cd syntest-solidity; npm run build
```

- Install Truffle

```bash
$ npm install -g truffle
```

### Building the docker image

```
docker build -t syntest-solidity:0.1.0 . --no-cache --build-arg REGISTRY_TOKEN={your_access_token}
```

```
docker run -it syntest-solidity:0.1.0 MetaCoin.sol "$(cat ./contracts/MetaCoin.sol)"
```

## Local development

To be able to make quick changes to the syntest-framework and then test it in the syntest-solidity project change the following line:

```
  "dependencies": {
    ...
    "@syntest-framework/syntest-framework": "^0.0.4",
    ...
  }
```

to:

```
  "dependencies": {
    ...
    "@syntest-framework/syntest-framework": "file:../syntest-framework",
    ...
  }
```

> This assumes that both projects are in the same super-directory

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

## Support

For questions and help with how to use this library, please see [SUPPORT.md](SUPPORT.md).

## Roadmap

- [x] Instrument the Contract Under Test (CUT) with function calls to record coverage.
- [x] Write test-case files that are runnable by truffle.js.

## Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you would like to change. For more information, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Authors and acknowledgment

- Annibale Panichella (PI)
- Mitchell Olsthoorn (Project Lead)
- Dimitri Stallenberg (Developer)

## License

The code within this project is licensed under the [Apache-2.0 license](LICENSE).
