import { SoliditySubject } from "./search/SoliditySubject";
import { SolidityTruffleStringifier } from "./testbuilding/SolidityTruffleStringifier";
import { SoliditySuiteBuilder } from "./testbuilding/SoliditySuiteBuilder";
import { SolidityRunner } from "./testcase/execution/SolidityRunner";
import { SolidityRandomSampler } from "./testcase/sampling/SolidityRandomSampler";

import {
  Archive,
  BudgetManager,
  createAlgorithmFromConfig,
  createDirectoryStructure,
  createTempDirectoryStructure,
  deleteTempDirectories,
  drawGraph,
  EvaluationBudget,
  ExceptionObjectiveFunction,
  ExecutionResult,
  getLogger,
  Properties,
  guessCWD,
  IterationBudget,
  loadConfig,
  processConfig,
  RuntimeVariable,
  SearchTimeBudget,
  setupLogger,
  setupOptions,
  StatisticsCollector,
  SummaryWriter,
  TestCase,
  TotalTimeBudget,
  loadTargetFiles,
} from "syntest-framework";

import * as path from "path";
import TruffleConfig = require("@truffle/config");

import API = require("../src/api");
import utils = require("../plugins/resources/plugin.utils");
import truffleUtils = require("../plugins/resources/truffle.utils");
import PluginUI = require("../plugins/resources/truffle.ui");
import {
  createMigrationsDir,
  generateDeployContracts,
  generateInitialMigration,
  removeMigrationsDir
} from "./util/deployment";
import {rmdirSync} from "fs";
import {setupTempFolders, tearDownTempFolders} from "./util/fileSystem";

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

    // Filesystem & Compiler Re-configuration
    const tempContractsDir = path.join('.syntest_coverage')
    const tempArtifactsDir = path.join('.syntest_artifacts')

    try {
      config = truffleUtils.normalizeConfig(config);

      await guessCWD(null);

      const additionalOptions = {}; // TODO
      setupOptions(this._program, additionalOptions);

      const args = process.argv.slice(process.argv.indexOf(this._program) + 1);
      const myConfig = loadConfig(args);

      processConfig(myConfig, args);
      setupLogger();

      config.testDir = Properties.temp_test_directory

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

      const obj = await loadTargetFiles()
      const included = obj['included']
      const excluded = obj['excluded']

      if (!included.length) {
        getLogger().error(`No targets where selected! Try changing the 'include' parameter`);
        process.exit(1)
      }

      // Instrument
      const targets = api.instrument(included);
      const skipped = excluded

      utils.reportSkipped(config, skipped);

      await setupTempFolders(tempContractsDir, tempArtifactsDir)
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

      const stringifier = new SolidityTruffleStringifier();
      const suiteBuilder = new SoliditySuiteBuilder(
        stringifier,
        api,
        truffle,
        config
      );

      const finalArchive = new Archive<TestCase>();

      for (const target of targets) {
        await createMigrationsDir()
        await generateInitialMigration()
        await generateDeployContracts([target], excluded.map((e) => path.basename(e.relativePath).split('.')[0]))

        await createDirectoryStructure();
        await createTempDirectoryStructure();

        getLogger().info(`Testing target: ${target.relativePath}`);

        const contractName = target.instrumented.contractName;
        const cfg = target.instrumented.cfg;
        const fnMap = target.instrumented.fnMap;

        drawGraph(
          cfg,
          path.join(Properties.cfg_directory, `${contractName}.svg`)
        );

        const currentSubject = new SoliditySubject(contractName, cfg, fnMap);

        const runner = new SolidityRunner(suiteBuilder, api, truffle, config);

        const sampler = new SolidityRandomSampler(currentSubject);
        const algorithm = createAlgorithmFromConfig(sampler, runner);

        await suiteBuilder.clearDirectory(Properties.temp_test_directory);

        // allocate budget manager

        const iterationBudget = new IterationBudget(
          Properties.iteration_budget
        );
        const evaluationBudget = new EvaluationBudget();
        const searchBudget = new SearchTimeBudget(Properties.search_time);
        const totalTimeBudget = new TotalTimeBudget(Properties.total_time);
        const budgetManager = new BudgetManager();
        budgetManager.addBudget(iterationBudget);
        budgetManager.addBudget(evaluationBudget);
        budgetManager.addBudget(searchBudget);
        budgetManager.addBudget(totalTimeBudget);

        // This searches for a covering population
        const archive = await algorithm.search(currentSubject, budgetManager);

        const collector = new StatisticsCollector(totalTimeBudget);
        collector.recordVariable(RuntimeVariable.VERSION, 1);
        collector.recordVariable(
          RuntimeVariable.CONFIGURATION,
          Properties.configuration
        );
        collector.recordVariable(RuntimeVariable.SUBJECT, target.relativePath);
        collector.recordVariable(
          RuntimeVariable.PROBE_ENABLED,
          Properties.probe_objective
        );
        collector.recordVariable(
          RuntimeVariable.ALGORITHM,
          Properties.algorithm
        );
        collector.recordVariable(
          RuntimeVariable.TOTAL_OBJECTIVES,
          currentSubject.getObjectives().length
        );

        collector.recordVariable(
          RuntimeVariable.COVERED_OBJECTIVES,
          archive.getObjectives().length
        );

        collector.recordVariable(RuntimeVariable.SEED, Properties.seed);
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

        collector.recordVariable(
          RuntimeVariable.EVALUATIONS,
          evaluationBudget.getCurrentBudget()
        );

        this.collectCoverageData(collector, archive, "branch");
        this.collectCoverageData(collector, archive, "statement");
        this.collectCoverageData(collector, archive, "function");
        this.collectCoverageData(collector, archive, "probe");

        const numOfExceptions = archive
          .getObjectives()
          .filter(
            (objective) => objective instanceof ExceptionObjectiveFunction
          ).length;
        collector.recordVariable(
          RuntimeVariable.COVERED_EXCEPTIONS,
          numOfExceptions
        );

        collector.recordVariable(
          RuntimeVariable.COVERAGE,
          (archive.getObjectives().length - numOfExceptions) /
            currentSubject.getObjectives().length
        );

        const statisticFile = path.resolve(Properties.statistics_directory);

        const writer = new SummaryWriter();
        writer.write(collector, statisticFile + "/statistics.csv");

        for (const key of archive.getObjectives()) {
          finalArchive.update(key, archive.getEncoding(key));
        }

        await deleteTempDirectories();

        await removeMigrationsDir()
      }

      await createMigrationsDir()
      await generateInitialMigration()
      await generateDeployContracts(targets, excluded.map((e) => path.basename(e.relativePath).split('.')[0]))

      await createDirectoryStructure();
      await createTempDirectoryStructure();

      await suiteBuilder.createSuite(finalArchive as Archive<TestCase>);

      await deleteTempDirectories();
      await removeMigrationsDir()

      config.test_files = await truffleUtils.getTestFilePaths({
        testDir: path.resolve(Properties.final_suite_directory),
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
      console.trace(e)
    }

    // Finish
    await tearDownTempFolders(tempContractsDir, tempArtifactsDir)

    // Shut server down
    await api.finish()

    //if (error !== undefined) throw error;
    //if (failures > 0) throw new Error(ui.generate("tests-fail", [failures]));
  }

  collectCoverageData(
    collector: StatisticsCollector<any>,
    archive: Archive<any>,
    objectiveType: string
  ): void {
    const total = new Set();
    const covered = new Set();

    for (const key of archive.getObjectives()) {
      const test = archive.getEncoding(key);
      const result: ExecutionResult = test.getExecutionResult();
      const contractName = key.getSubject().name.concat(".sol");

      result
        .getTraces()
        .filter((element) => element.type.includes(objectiveType))
        .filter((element) => {
          const paths = (element as any).contractPath.split("/");
          return paths[paths.length - 1].includes(contractName);
        })
        .forEach((current) => {
          total.add(
            current.type + "_" + current.line + "_" + current.locationIdx
          );

          if (current.hits > 0)
            covered.add(
              current.type + "_" + current.line + "_" + current.locationIdx
            );
        });
    }

    switch (objectiveType) {
      case "branch":
        {
          collector.recordVariable(
            RuntimeVariable.COVERED_BRANCHES,
            covered.size
          );
          collector.recordVariable(RuntimeVariable.TOTAL_BRANCHES, total.size);

          if (total.size > 0.0) {
            collector.recordVariable(
              RuntimeVariable.BRANCH_COVERAGE,
              covered.size / total.size
            );
          } else {
            collector.recordVariable(RuntimeVariable.BRANCH_COVERAGE, 0);
          }
        }
        break;
      case "statement":
        {
          collector.recordVariable(RuntimeVariable.COVERED_LINES, covered.size);
          collector.recordVariable(RuntimeVariable.TOTAL_LINES, total.size);

          if (total.size > 0.0) {
            collector.recordVariable(
              RuntimeVariable.LINE_COVERAGE,
              covered.size / total.size
            );
          } else {
            collector.recordVariable(RuntimeVariable.LINE_COVERAGE, 0);
          }
        }
        break;
      case "function":
        {
          collector.recordVariable(
            RuntimeVariable.COVERED_FUNCTIONS,
            covered.size
          );
          collector.recordVariable(RuntimeVariable.TOTAL_FUNCTIONS, total.size);

          if (total.size > 0.0) {
            collector.recordVariable(
              RuntimeVariable.FUNCTION_COVERAGE,
              covered.size / total.size
            );
          } else {
            collector.recordVariable(RuntimeVariable.FUNCTION_COVERAGE, 0);
          }
        }
        break;
      case "probe":
        {
          collector.recordVariable(
            RuntimeVariable.COVERED_PROBES,
            covered.size
          );
          collector.recordVariable(RuntimeVariable.TOTAL_PROBES, total.size);

          if (total.size > 0.0) {
            collector.recordVariable(
              RuntimeVariable.PROBE_COVERAGE,
              covered.size / total.size
            );
          } else {
            collector.recordVariable(RuntimeVariable.PROBE_COVERAGE, 0);
          }
        }
        break;
    }
  }
}
