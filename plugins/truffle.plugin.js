const {guessCWD, loadConfig, setupOptions} = require("syntest-framework");

const API = require('./../lib/api');
const utils = require('./resources/plugin.utils');
const truffleUtils = require('./resources/truffle.utils');
const PluginUI = require('./resources/truffle.ui');
const pkg = require('./../package.json');
const death = require('death');
const path = require('path');
const Web3 = require('web3');

const {setupLogger, processConfig, Fitness, createAlgorithmFromConfig, createCriterionFromConfig} = require('syntest-framework')

const {SolidityRandomSampler} = require('../dist/lib/search/sampling/SolidityRandomSampler')
const {SolidityRunner} = require("../dist/lib/runner/SolidityRunner");
const {SoliditySuiteBuilder} = require("../dist/lib/testbuilding/SoliditySuiteBuilder");
const {SolidityGeneOptionManager} = require("../dist/lib/search/gene/SolidityGeneOptionManager");
const {SolidityTruffleStringifier} = require("../dist/lib/testbuilding/SolidityTruffleStringifier");

const program = 'syntest-solidity'

/**
 * Truffle Plugin: `truffle run coverage [options]`
 * @param  {Object}   config   @truffle/config config
 * @return {Promise}
 */
async function plugin(config){
  let ui;
  let api;
  let error;
  let truffle;
  let testsErrored = false;
  let failures;

  try {
    death(utils.finish.bind(null, config, api)); // Catch interrupt signals

    config = truffleUtils.normalizeConfig(config);

    await guessCWD(null)

    const additionalOptions = {} // TODO
    setupOptions(program, additionalOptions)

    const args = process.argv.slice(process.argv.indexOf(program) + 1)
    const myConfig = loadConfig(args)

    processConfig(myConfig, args)
    setupLogger()

    ui = new PluginUI(config.logger.log);

    if(config.help) return ui.report('help');    // Exit if --help

    truffle = truffleUtils.loadLibrary(config);
    api = new API(myConfig);

    truffleUtils.setNetwork(config, api);

    // Server launch
    const client = api.client || truffle.ganache;
    const address = await api.ganache(client);

    const web3 = new Web3(address);
    const accounts = await web3.eth.getAccounts();
    const nodeInfo = await web3.eth.getNodeInfo();
    const ganacheVersion = nodeInfo.split('/')[1];

    truffleUtils.setNetworkFrom(config, accounts);

    // Version Info
    ui.report('versions', [
      truffle.version,
      ganacheVersion,
      pkg.version
    ]);

    // Exit if --version
    if (config.version) return await utils.finish(config, api);

    ui.report('network', [
      config.network,
      config.networks[config.network].network_id,
      config.networks[config.network].port
    ]);

    // Run post-launch server hook;
    await api.onServerReady(config);

    // Instrument
    const skipFiles = api.skipFiles || [];
    skipFiles.push('Migrations.sol');

    let {
      targets,
      skipped
    } = utils.assembleFiles(config, skipFiles);

    targets = api.instrument(targets);

    utils.reportSkipped(config, skipped);

    // Filesystem & Compiler Re-configuration
    const {
      tempArtifactsDir,
      tempContractsDir
    } = utils.getTempLocations(config);

    utils.setupTempFolders(config, tempContractsDir, tempArtifactsDir)
    utils.save(targets, config.contracts_directory, tempContractsDir);
    utils.save(skipped, config.contracts_directory, tempContractsDir);

    config.contracts_directory = tempContractsDir;
    config.build_directory = tempArtifactsDir;

    config.contracts_build_directory = path.join(
      tempArtifactsDir,
      path.basename(config.contracts_build_directory)
    );

    config.all = true;
    config.compilers.solc.settings.optimizer.enabled = false;

    // Compile Instrumented Contracts
    await truffle.contracts.compile(config);
    await api.onCompileComplete(config);

    // TODO do this for each and every of the targets
    const stringifier = new SolidityTruffleStringifier(targets[1].instrumented.contractName)
    const suiteBuilder = new SoliditySuiteBuilder(stringifier, api, truffle, config, targets[1])
    const runner = new SolidityRunner(suiteBuilder, api, truffle, config)

    const FitnessObject = new Fitness(targets[1].instrumented.cfg, runner)
    const GeneOptionsObject = new SolidityGeneOptionManager(targets[1])
    const Sampler = new SolidityRandomSampler(GeneOptionsObject)

    const algorithm = createAlgorithmFromConfig(FitnessObject, GeneOptionsObject, Sampler)

    await suiteBuilder.clearDirectory(config.testDir)

    // This searches for a covering population
    let population = await algorithm.search(createCriterionFromConfig())

    await suiteBuilder.createTests(population)

    config.test_files = await truffleUtils.getTestFilePaths(config);
    // Run tests
    try {
      failures = await truffle.test.run(config)
    } catch (e) {
      error = e.stack;
    }
    await api.onTestsComplete(config)

    // Run Istanbul
    await api.report();
    await api.onIstanbulComplete(config);

  } catch(e){
    error = e;
  }

  // Finish
  await utils.finish(config, api);

  if (error !== undefined) throw error;
  if (failures > 0) throw new Error(ui.generate('tests-fail', [failures]));
}

module.exports = plugin;
