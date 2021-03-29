#!/usr/bin/env node

import {
  createAlgorithmFromConfig,
  createCriterionFromConfig,
  createDirectoryStructure,
  deleteTempDirectories,
  Fitness,
  getLogger,
  getProperty,
  guessCWD,
  loadConfig,
  processConfig,
  setupLogger,
  setupOptions,
} from "syntest-framework";

import {
  SolidityTarget,
  SolidityRandomSampler,
  SolidityRunner,
  SoliditySuiteBuilder,
  SolidityTruffleStringifier,
} from "./index";

const Api = require('./api')

import * as path from "path";

const utils = require("../plugins/resources/plugin.utils");
const truffleUtils = require("../plugins/resources/truffle.utils");
const Web3 = require("web3");
const death = require("death");
const TruffleConfig = require("@truffle/config");

// TODO get extra config options
// const {properties} = require('./properties')

const program = "syntest-solidity";

async function start() {
  let truffleConfig = TruffleConfig.default();

  truffleConfig = truffleUtils.normalizeConfig(truffleConfig);

  death(utils.finish.bind(null, truffleConfig)); // Catch interrupt signals

  await guessCWD(null);

  const additionalOptions = {}; // TODO
  setupOptions(program, additionalOptions);

  const args = process.argv.slice(process.argv.indexOf(program) + 1);
  const config = loadConfig(args);

  processConfig(config, args);
  setupLogger();

  const truffle = truffleUtils.loadLibrary(truffleConfig);
  const api = new Api(config);

  truffleUtils.setNetwork(truffleConfig, api);

  // Server launch
  const client = api.client || truffle.ganache;
  const address = await api.ganache(client);

  const web3 = new Web3(address);
  const accounts = await web3.eth.getAccounts();

  truffleUtils.setNetworkFrom(truffleConfig, accounts);

  // Run post-launch server hook;
  await api.onServerReady(truffleConfig);

  // Instrument
  const skipFiles = api.skipFiles || [];
  skipFiles.push("Migrations.sol");

  // eslint-disable-next-line prefer-const
  let { targets, skipped } = utils.assembleFiles(truffleConfig, skipFiles);

  targets = api.instrument(targets);

  // Filesystem & Compiler Re-configuration
  const { tempArtifactsDir, tempContractsDir } = utils.getTempLocations(
    truffleConfig
  );

  utils.setupTempFolders(truffleConfig, tempContractsDir, tempArtifactsDir);
  utils.save(targets, truffleConfig.contracts_directory, tempContractsDir);
  utils.save(skipped, truffleConfig.contracts_directory, tempContractsDir);

  truffleConfig.contracts_directory = tempContractsDir;
  truffleConfig.build_directory = tempArtifactsDir;

  truffleConfig.contracts_build_directory = path.join(
    tempArtifactsDir,
    path.basename(truffleConfig.contracts_build_directory)
  );

  truffleConfig.all = true;
  truffleConfig.compilers.solc.settings.optimizer.enabled = false;

  // Compile Instrumented Contracts
  await truffle.contracts.compile(truffleConfig);
  await api.onCompileComplete(truffleConfig);

  await createDirectoryStructure();

  const stringifier = new SolidityTruffleStringifier();
  const suiteBuilder = new SoliditySuiteBuilder(
    stringifier,
    api,
    truffle,
    config
  );

  const finalArchive = new Map();

  for (const target of targets) {
    getLogger().debug(`Testing target: ${target.relativePath}`);
    if (getProperty("exclude").includes(target.relativePath)) {
      continue;
    }

    const targetName = target.instrumented.contractName;
    const targetCFG = target.instrumented.cfg;
    const targetFnMap = target.instrumented.fnMap;

    const actualTarget = new SolidityTarget(targetName, targetCFG, targetFnMap);

    const runner = new SolidityRunner(suiteBuilder, api, truffle, config);

    const FitnessObject = new Fitness(runner, actualTarget);
    const Sampler = new SolidityRandomSampler(actualTarget);
    const algorithm = createAlgorithmFromConfig(
      actualTarget,
      FitnessObject,
      Sampler
    );

    await suiteBuilder.clearDirectory(getProperty("temp_test_directory"));

    // This searches for a covering population
    const archive = await algorithm.search(createCriterionFromConfig());

    for (const key of archive.keys()) {
      finalArchive.set(key, archive.get(key));
    }
  }

  await suiteBuilder.createSuite(finalArchive);

  await deleteTempDirectories();

  truffleConfig.test_files = await truffleUtils.getTestFilePaths(truffleConfig);
  // Run tests
  try {
    const failures = await truffle.test.run(truffleConfig);
    getLogger().info(failures);
  } catch (e) {
    const error = e.stack;
    getLogger().info(error);
  }
  await api.onTestsComplete(truffleConfig);

  // Run Istanbul
  await api.report();
  await api.onIstanbulComplete(truffleConfig);

  // Finish
  await utils.finish(truffleConfig, api);
}

start();
