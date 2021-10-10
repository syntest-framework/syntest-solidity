# SynTest Framework - Solidity

[![](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml/badge.svg)](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml)

SynTest Solidity is a tool for automatically generating test cases for the Solidity platform. This tool is part of the [SynTest Framework](https://www.syntest.org). This framework contains multiple tools related to the generation of synthetic tests.

### Overview

The common core contains the common interfaces for the code control-flow representation, test case structure, genes, and the implementation for the meta-heuristic search algorithms.

## Installation

#### NPM

The simplest way to use syntest-solidity is by installing the [npm package](https://www.npmjs.com/package/syntest/solidity).

```bash
$ npm install @syntest/solidity
```

You can install it in your project as shown in the snippit above or you can install the package globally by using the npm options `-g`.

#### From source

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

To start you need to be in the root of the project folder containing the contracts you want to create test-cases for. Next, you need to install two dev-dependencies in your project, namely [chai](https://www.npmjs.com/package/chai) and [chai-as-promised](https://www.npmjs.com/package/chai-as-promised). Both are needed to run the tests.

After installing these dependencies together with the tool, you can run the following example command.

```bash
$ syntest-solidity --include="{PATH TO YOUR CONTRACTS FOLDER}/**/*.sol" --search-time=10 --total_time=10
```

This will test all solidity contracts that are contained in the contracts folder that you should specify. It will run for 10 seconds.

Syntest-Solidity is highly configurable and supports a bunch of options and arguments, all of them can be found by providing the `--help` option or `-h` for short. Another way of configuring the tool is by putting a .syntest.js file in the root of your project. The file should have the following structure:

```js
module.exports = {
    population_size: 10,
    max_depth: 5,
    ...
}
```

The tool can be run via two modes, standalone or as a truffle plugin.

#### Standalone

```bash
$ syntest-solidity [options]
```

#### As a truffle plugin

To run syntest-solidity as a plugin of the truffle testing library, you need to create a truffle-config.js with the following contents:

> This file is auto-generated when using the standalone tool.

```js
module.exports = {
  test_directory: ".syntest/tests",
  plugins: ["syntest-solidity"],
};
```

Next, you can run the following truffle command.

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
