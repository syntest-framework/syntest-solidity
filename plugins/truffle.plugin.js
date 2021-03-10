const {
  guessCWD,
  loadConfig,
  setupOptions,
  createDirectoryStructure,
  deleteTempDirectories,
} = require("syntest-framework");
const {
  drawGraph,
  setupLogger,
  getLogger,
  getProperty,
  processConfig,
  Fitness,
  createAlgorithmFromConfig,
  createCriterionFromConfig,
} = require("syntest-framework");

const API = require("../src/api");
const utils = require("./resources/plugin.utils");
const truffleUtils = require("./resources/truffle.utils");
const PluginUI = require("./resources/truffle.ui");
const pkg = require("./../package.json");
const death = require("death");
const path = require("path");
const Web3 = require("web3");

const {
  SolidityTarget,
  SolidityRandomSampler,
  SolidityRunner,
  SoliditySuiteBuilder,
  SolidityTruffleStringifier,
} = require("../dist/index");

const program = "syntest-solidity";

/**
 * Truffle Plugin: `truffle run coverage [options]`
 * @param  {Object}   config   @truffle/config config
 * @return {Promise}
 */
async function plugin(config) {
  let ui;
  let api;
  let error;
  let truffle;
  let testsErrored = false;
  let failures;

  try {
    death(utils.finish.bind(null, config, api)); // Catch interrupt signals

    config = truffleUtils.normalizeConfig(config);

    await guessCWD(null);

    const additionalOptions = {}; // TODO
    setupOptions(program, additionalOptions);

    const args = process.argv.slice(process.argv.indexOf(program) + 1);
    const myConfig = loadConfig(args);

    processConfig(myConfig, args);
    setupLogger();

    config.testDir = getProperty("temp_test_directory");

    ui = new PluginUI(config.logger.log);

    if (config.help) return ui.report("help"); // Exit if --help

    truffle = truffleUtils.loadLibrary(config);
    api = new API(myConfig);

    truffleUtils.setNetwork(config, api);

    // Server launch
    const client = api.client || truffle.ganache;
    const address = await api.ganache(client);

    const web3 = new Web3(address);
    const accounts = await web3.eth.getAccounts();
    const nodeInfo = await web3.eth.getNodeInfo();
    const ganacheVersion = nodeInfo.split("/")[1];

    truffleUtils.setNetworkFrom(config, accounts);

    // Version Info
    ui.report("versions", [truffle.version, ganacheVersion, pkg.version]);

    // Exit if --version
    if (config.version) return await utils.finish(config, api);

    ui.report("network", [
      config.network,
      config.networks[config.network].network_id,
      config.networks[config.network].port,
    ]);

    // Run post-launch server hook;
    await api.onServerReady(config);

    // Instrument
    const skipFiles = api.skipFiles || [];
    skipFiles.push("Migrations.sol");

    let { targets, skipped } = utils.assembleFiles(config, skipFiles);

    targets = api.instrument(targets);

    utils.reportSkipped(config, skipped);

    // Filesystem & Compiler Re-configuration
    const { tempArtifactsDir, tempContractsDir } = utils.getTempLocations(
      config
    );

    utils.setupTempFolders(config, tempContractsDir, tempArtifactsDir);
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
    config.quiet = true;

    // Compile Instrumented Contracts
    await truffle.contracts.compile(config);
    await api.onCompileComplete(config);

    await createDirectoryStructure();

    const stringifier = new SolidityTruffleStringifier();
    const suiteBuilder = new SoliditySuiteBuilder(
      stringifier,
      api,
      truffle,
      config
    );

    let finalArchive = new Map();

    for (let target of targets) {
      getLogger().debug(`Testing target: ${target.relativePath}`);
      if (getProperty("exclude").includes(target.relativePath)) {
        continue;
      }

      const targetName = target.instrumented.contractName;
      const targetCFG = target.instrumented.cfg;
      const targetFnMap = target.instrumented.fnMap;

      drawGraph(
        targetCFG,
        path.join(getProperty("cfg_directory"), `${targetName}.svg`)
      );

      const actualTarget = new SolidityTarget(
        targetName,
        targetCFG,
        targetFnMap
      );

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
      let archive = await algorithm.search(createCriterionFromConfig());

      for (let key of archive.keys()) {
        finalArchive.set(key, archive.get(key));
      }
    }

    await suiteBuilder.createSuite(finalArchive);

    await deleteTempDirectories();

    config.test_files = await truffleUtils.getTestFilePaths({
      testDir: path.resolve(getProperty("final_suite_directory")),
    });
    // Run tests
    try {
      failures = await truffle.test.run(config);
    } catch (e) {
      error = e.stack;
    }
    await api.onTestsComplete(config);

    // Run Istanbul
    await api.report();
    await api.onIstanbulComplete(config);
  } catch (e) {
    error = e;
  }

  // Finish
  await utils.finish(config, api);

  if (error !== undefined) throw error;
  if (failures > 0) throw new Error(ui.generate("tests-fail", [failures]));
}

module.exports = plugin;
