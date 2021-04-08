import { SoliditySubject } from "./search/SoliditySubject";
import { SolidityTruffleStringifier } from "./testbuilding/SolidityTruffleStringifier";
import { SoliditySuiteBuilder } from "./testbuilding/SoliditySuiteBuilder";
import { SolidityRunner } from "./testcase/execution/SolidityRunner";
import { SolidityRandomSampler } from "./testcase/sampling/SolidityRandomSampler";
import { RuntimeVariable } from "syntest-framework";
import TruffleConfig = require("@truffle/config");

import {
  guessCWD,
  loadConfig,
  setupOptions,
  createDirectoryStructure,
  deleteTempDirectories,
  drawGraph,
  setupLogger,
  getLogger,
  getProperty,
  processConfig,
  createAlgorithmFromConfig,
  BudgetManager,
  IterationBudget,
  SearchTimeBudget,
  Archive,
  SummaryWriter,
  StatisticsCollector,
  BranchObjectiveFunction,
  FunctionObjectiveFunction,
  TotalTimeBudget,
  TestCase,
} from "syntest-framework";

import * as path from "path";

import API = require("../src/api");
import utils = require("../plugins/resources/plugin.utils");
import truffleUtils = require("../plugins/resources/truffle.utils");
import PluginUI = require("../plugins/resources/truffle.ui");
const pkg = require("../package.json");
const Web3 = require("web3");

export class SolidityLauncher {
  private readonly _program = "syntest-solidity";

  /**
   * Truffle Plugin: `truffle run coverage [options]`
   * @param  {Object}   config   @truffle/config config
   * @return {Promise}
   */
  public async run(config: TruffleConfig) {
    let api, error, failures, ui;
    try {
      config = truffleUtils.normalizeConfig(config);

      await guessCWD(null);

      const additionalOptions = {}; // TODO
      setupOptions(this._program, additionalOptions);

      const args = process.argv.slice(process.argv.indexOf(this._program) + 1);
      const myConfig = loadConfig(args);

      processConfig(myConfig, args);
      setupLogger();

      config.testDir = getProperty("temp_test_directory");

      ui = new PluginUI(config.logger.log);

      if (config.help) return ui.report("help"); // Exit if --help

      const truffle = truffleUtils.loadLibrary(config);
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

      const finalArchive = new Archive<TestCase>();

      for (const target of targets) {
        getLogger().debug(`Testing target: ${target.relativePath}`);
        if (getProperty("exclude").includes(target.relativePath)) {
          continue;
        }

        const contractName = target.instrumented.contractName;
        const cfg = target.instrumented.cfg;
        const fnMap = target.instrumented.fnMap;

        drawGraph(
          cfg,
          path.join(getProperty("cfg_directory"), `${contractName}.svg`)
        );

        const currentSubject = new SoliditySubject(contractName, cfg, fnMap);

        const runner = new SolidityRunner(suiteBuilder, api, truffle, config);

        const sampler = new SolidityRandomSampler(currentSubject);
        const algorithm = createAlgorithmFromConfig(sampler, runner);

        await suiteBuilder.clearDirectory(getProperty("temp_test_directory"));

        // allocate budget manager
        const budgets = getProperty("stopping_criteria");
        let maxTime = 0,
          maxIterations = 0;
        for (const budget of budgets) {
          if (budget.criterion === "generation_limit") {
            maxIterations = budget.limit;
          } else if (budget.criterion === "time_limit") {
            maxTime = budget.limit;
          }
        }
        const iterationBudget = new IterationBudget(maxIterations);
        const searchBudget = new SearchTimeBudget(maxTime);
        const totalTimeBudget = new TotalTimeBudget(maxTime + 30);
        const budgetManager = new BudgetManager();
        budgetManager.addBudget(iterationBudget);
        budgetManager.addBudget(searchBudget);
        budgetManager.addBudget(totalTimeBudget);

        // This searches for a covering population
        const archive = await algorithm.search(currentSubject, budgetManager);

        const collector = new StatisticsCollector(totalTimeBudget);
        collector.recordVariable(RuntimeVariable.SUBJECT, target.relativePath);
        collector.recordVariable(
          RuntimeVariable.TOTAL_OBJECTIVES,
          currentSubject.getObjectives().length
        );

        collector.recordVariable(
          RuntimeVariable.COVERED_OBJECTIVES,
          archive.getObjectives().length
        );

        collector.recordVariable(RuntimeVariable.SEED, getProperty("seed"));
        collector.recordVariable(
          RuntimeVariable.SEARCH_TIME,
          searchBudget.getCurrentBudget()
        );

        collector.recordVariable(
          RuntimeVariable.TOTAL_TIME,
          totalTimeBudget.getCurrentBudget()
        );

        collector.recordVariable(
          RuntimeVariable.ITERATIONS,
          iterationBudget.getCurrentBudget()
        );

        this.collectCoverageData(collector, currentSubject, archive);

        const statisticFile = path.resolve(getProperty("statistics_directory"));

        const writer = new SummaryWriter();
        writer.write(collector, statisticFile + "/statistics.csv");

        for (const key of archive.getObjectives()) {
          finalArchive.update(key, archive.getEncoding(key));
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

  public collectCoverageData(collector, currentSubject, archive): void {
    let total_branches = 0;
    let total_functions = 0;
    for (const obj of currentSubject.getObjectives()) {
      if (obj instanceof BranchObjectiveFunction) {
        total_branches++;
      } else if (obj instanceof FunctionObjectiveFunction) {
        total_functions++;
      }
    }
    collector.recordVariable(RuntimeVariable.TOTAL_BRANCHES, total_branches);
    collector.recordVariable(RuntimeVariable.TOTAL_FUNCTIONS, total_functions);

    let coveredBranches = 0;
    let coveredFunctions = 0;
    for (const obj of archive.getObjectives()) {
      if (obj instanceof BranchObjectiveFunction) {
        coveredBranches++;
      } else if (obj instanceof FunctionObjectiveFunction) {
        coveredFunctions++;
      }
    }
    collector.recordVariable(RuntimeVariable.COVERED_BRANCHES, coveredBranches);
    collector.recordVariable(
      RuntimeVariable.COVERED_FUNCTIONS,
      coveredFunctions
    );
    collector.recordVariable(
      RuntimeVariable.COVERAGE,
      archive.getObjectives().length / currentSubject.getObjectives().length
    );
  }
}
