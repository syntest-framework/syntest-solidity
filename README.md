# SynTest Framework - Solidity

[![](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml/badge.svg)](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml)

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

- Compile to JavaScript

```bash
$ cd syntest-framework; npm run tsc
$ cd syntest-solidity; npm run tsc
```

- Install Truffle

```bash
$ npm install -g truffle
```

## Usage

```bash
$ truffle run syntest-solidity
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

The content of this project itself is licensed under the [MIT license](LICENSE.md).
