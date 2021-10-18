# SynTest Framework - Solidity

> The aim of this tool is make it easier for Solidity contract developers to test their contracts in a more effective and efficient way.

[![](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml/badge.svg)](https://github.com/syntest-framework/syntest-solidity/actions/workflows/node.js.yml)
[![publish](https://github.com/syntest-framework/syntest-solidity/actions/workflows/publish.yml/badge.svg)](https://github.com/syntest-framework/syntest-framework/actions/workflows/publish.yml)
![npm (scoped)](https://img.shields.io/npm/v/@syntest/solidity?style=flat)
![node-current (scoped)](https://img.shields.io/node/v/@syntest/solidity)

### What is SynTest Solidity?

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

The tool can be used by cloning the project, installing its dependencies, and compiling the TypeScript:

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

#### Building the docker image

```bash
docker build -t syntest-solidity:0.1.0 . --no-cache --build-arg REGISTRY_TOKEN={your_access_token}
```

```bash
docker run -it syntest-solidity:0.1.0 MetaCoin.sol "$(cat ./contracts/MetaCoin.sol)"
```

## Local development

To be able to make quick changes to the syntest-framework and then test it in the syntest-solidity project use `npm link`:

```bash
cd <PATH_TO_SYNTEST_FRAMEWORK>; npm link
cd <PATH_TO_SYNTEST_SOLIDITY>; npm link @syntest/framework
```

This creates a symbolic link to the local syntest-framework instance in the node modules folder of syntest-solidity.

## Usage

To start you need to be in the root of the project folder containing the contracts you want to create test-cases for. Next, you need to install two dev-dependencies in your project, namely [chai](https://www.npmjs.com/package/chai) and [chai-as-promised](https://www.npmjs.com/package/chai-as-promised). Both are needed to run the tests.

After installing these dependencies together with the tool, you can run the following example command.

```bash
$ syntest-solidity --include="<PATH_TO_YOUR_CONTRACTS_FOLDER>/contracts/**/*.sol" --search-time=10 --total_time=10
```

This will test all solidity contracts that are contained in the contracts folder. It will run for 10 seconds.

> Note that currently the contracts folder has to be named "contracts" for the tool to work. This will be solved in a later version.

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

The code within this project is licensed under the [Apache-2.0 license](LICENSE).
