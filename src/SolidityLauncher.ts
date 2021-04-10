import { SoliditySubject } from "./search/SoliditySubject";
import { SolidityTruffleStringifier } from "./testbuilding/SolidityTruffleStringifier";
import { SoliditySuiteBuilder } from "./testbuilding/SoliditySuiteBuilder";
import { SolidityRunner } from "./testcase/execution/SolidityRunner";
import { SolidityRandomSampler } from "./testcase/sampling/SolidityRandomSampler";
import {
  Archive,
  RuntimeVariable,
  StatisticsCollector,
  ExecutionResult,
  TestCase,
} from "syntest-framework";
import { RequireObjectiveFunction } from "./criterion/RequireObjectiveFunction";
import TruffleConfig = require("@truffle/config");
import { Encoding } from "crypto";

const {
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
  SummaryWriter,
  BranchObjectiveFunction,
  FunctionObjectiveFunction,
  TotalTimeBudget,
} = require("syntest-framework");

const API = require("../src/api");
const utils = require("../plugins/resources/plugin.utils");
const truffleUtils = require("../plugins/resources/truffle.utils");
const PluginUI = require("../plugins/resources/truffle.ui");
const pkg = require("../package.json");
const path = require("path");
const Web3 = require("web3");

export class SolidityLauncher {
  private readonly _program = "syntest-solidity";

  /**
   * Truffle Plugin: `truffle run coverage [options]`
   * @param  {Object}   config   @truffle/config config
   * @return {Promise}
   */
  async run(config: TruffleConfig) {
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

      const finalArchive = new Archive();

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

        this.collectCoverageData(collector, archive, "branch");
        this.collectCoverageData(collector, archive, "statement");
        this.collectCoverageData(collector, archive, "function");
        this.collectCoverageData(collector, archive, "probe");

        const statisticFile = path.resolve(getProperty("statistics_directory"));

        const writer = new SummaryWriter();
        writer.write(collector, statisticFile + "/statistics.csv");

        for (const key of archive.getObjectives()) {
          finalArchive.update(key, archive.getEncoding(key));
        }
      }

      await suiteBuilder.createSuite(finalArchive as Archive<TestCase>);

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

  collectCoverageData(
    collector: StatisticsCollector<any>,
    archive: Archive<any>,
    type: string
  ): void {
    let total = 0;
    let covered = 0;

    for (const key of archive.getObjectives()) {
      const test = archive.getEncoding(key);
      const result: ExecutionResult = test.getExecutionResult();
      const elements = result
        .getTraces()
        .filter((element) => element.type.includes(type));

      total += elements.length;
      covered += elements.filter((element) => element.hits > 0).length;
    }

    switch (type) {
      case "branch":
        {
          collector.recordVariable(RuntimeVariable.COVERED_BRANCHES, covered);
          collector.recordVariable(RuntimeVariable.TOTAL_BRANCHES, total);
        }
        break;
      case "statement":
        {
          collector.recordVariable(RuntimeVariable.COVERED_LINES, covered);
          collector.recordVariable(RuntimeVariable.TOTAL_LINES, total);
        }
        break;
      case "function":
        {
          collector.recordVariable(RuntimeVariable.COVERED_FUNCTIONS, covered);
          collector.recordVariable(RuntimeVariable.TOTAL_FUNCTIONS, total);
        }
        break;
      case "probe":
        {
          collector.recordVariable(RuntimeVariable.COVERED_PROBES, covered);
          collector.recordVariable(RuntimeVariable.COVERED_PROBES, total);
        }
        break;
    }
  }
}
