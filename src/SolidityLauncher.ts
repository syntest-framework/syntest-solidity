import { SoliditySubject } from "./search/SoliditySubject";
import { SolidityTruffleStringifier } from "./testbuilding/SolidityTruffleStringifier";
import { SoliditySuiteBuilder } from "./testbuilding/SoliditySuiteBuilder";
import { SolidityRunner } from "./testcase/execution/SolidityRunner";
import { SolidityRandomSampler } from "./testcase/sampling/SolidityRandomSampler";
import { SolidityCFGFactory } from "./graph/SolidityCFGFactory";
const SolidityParser = require("@solidity-parser/parser");

import {
  Archive,
  BudgetManager,
  configureTermination,
  CoverageWriter,
  createAlgorithmFromConfig,
  createDirectoryStructure,
  createTempDirectoryStructure,
  deleteTempDirectories,
  drawGraph,
  EvaluationBudget,
  Properties,
  guessCWD,
  IterationBudget,
  loadConfig,
  processConfig,
  SearchTimeBudget,
  setupLogger,
  setupOptions,
  StatisticsCollector,
  StatisticsSearchListener,
  SummaryWriter,
  TotalTimeBudget,
  loadTargets,
  setUserInterface,
  getUserInterface,
  getSeed,
  clearDirectory,
} from "syntest-framework";

import * as path from "path";
import TruffleConfig = require("@truffle/config");

import API = require("../src/api");

import { normalizeConfig } from "./util/config";
import { setNetwork, setNetworkFrom } from "./util/network";

import {
  createTruffleConfig,
  getTestFilePaths,
  loadLibrary,
  save,
  setupTempFolders,
  tearDownTempFolders,
} from "./util/fileSystem";

import Messages from "./ui/Messages";
import { SolidityCommandLineInterface } from "./ui/SolidityCommandLineInterface";
import { SolidityMonitorCommandLineInterface } from "./ui/SolidityMonitorCommandLineInterface";

import { ConstantPool } from "./seeding/constant/ConstantPool";
import { ConstantVisitor } from "./seeding/constant/ConstantVisitor";
import { SolidityTestCase } from "./testcase/SolidityTestCase";
import { SolidityTreeCrossover } from "./search/operators/crossover/SolidityTreeCrossover";

import { TargetPool } from "./analysis/static/TargetPool";
import { SourceGenerator } from "./analysis/static/source/SourceGenerator";
import { ASTGenerator } from "./analysis/static/ast/ASTGenerator";
import { TargetMapGenerator } from "./analysis/static/map/TargetMapGenerator";
import TargetFile from "./targetting/TargetFile";
import {
  collectCoverageData,
  collectProbeCoverageData,
  collectInitialVariables,
  collectStatistics,
} from "./util/collection";

const pkg = require("../package.json");
const Web3 = require("web3");

export class SolidityLauncher {
  private readonly _program = "syntest-solidity";
  private readonly tempContractsDir = path.join(
    process.cwd(),
    ".syntest_coverage"
  );
  private readonly tempArtifactsDir = path.join(
    process.cwd(),
    ".syntest_artifacts"
  );

  private api;
  private config;
  private truffle;

  private targetPool: TargetPool;

  /**
   * Truffle Plugin: `truffle run coverage [options]`
   * @param  {Object}   config   @truffle/config config
   * @return {Promise}
   */
  public async run(config: TruffleConfig): Promise<void> {
    await createTruffleConfig();

    try {
      this.config = normalizeConfig(config);

      await guessCWD(this.config.workingDir);
      const [included, excluded] = await this.setup();
      const [archive, imports, dependencies] = await this.search(
        included,
        excluded
      );
      await this.finalize(archive, imports, dependencies);
    } catch (e) {
      console.trace(e);
    }

    await this.exit();
  }

  async exit(): Promise<void> {
    // Finish
    await tearDownTempFolders(this.tempContractsDir, this.tempArtifactsDir);

    // Shut server down
    await this.api.finish();

    process.exit(0);
  }

  async setup(): Promise<[Map<string, string[]>, Map<string, string[]>]> {
    // Filesystem & Compiler Re-configuration
    const additionalOptions = {}; // TODO
    setupOptions(this._program, additionalOptions);

    const args = process.argv.slice(process.argv.indexOf(this._program) + 1);
    const myConfig = loadConfig(args);

    processConfig(myConfig, args);
    setupLogger();

    const messages = new Messages();

    if (Properties.user_interface === "regular") {
      setUserInterface(
        new SolidityCommandLineInterface(
          Properties.console_log_level === "silent",
          Properties.console_log_level === "verbose",
          messages
        )
      );
    } else if (Properties.user_interface === "monitor") {
      setUserInterface(
        new SolidityMonitorCommandLineInterface(
          Properties.console_log_level === "silent",
          Properties.console_log_level === "verbose",
          messages
        )
      );
    }

    this.config.testDir = path.join(
      process.cwd(),
      Properties.temp_test_directory
    );

    this.truffle = loadLibrary(this.config);
    this.api = new API(myConfig);

    getUserInterface().report("clear", []);
    getUserInterface().report("asciiArt", ["Syntest"]);
    getUserInterface().report("version", [require("../package.json").version]);

    if (this.config.help || this.config.h) {
      getUserInterface().report("help", []);
      await this.exit();
    } // Exit if --help

    setNetwork(this.config, this.api);

    // Server launch
    const client = this.api.client || this.truffle.ganache;
    const address = await this.api.ganache(client);

    const web3 = new Web3(address);
    const accounts = await web3.eth.getAccounts();
    const nodeInfo = await web3.eth.getNodeInfo();
    const ganacheVersion = nodeInfo.split("/")[1];

    setNetworkFrom(this.config, accounts);

    // Exit if --version
    if (this.config.version) {
      getUserInterface().report("versions", [
        this.truffle.version,
        ganacheVersion,
        pkg.version,
      ]); // Exit if --help

      // Finish
      await tearDownTempFolders(this.tempContractsDir, this.tempArtifactsDir);

      // Shut server down
      await this.api.finish();
      await this.exit();
    }

    getUserInterface().report("header", ["General info"]);

    getUserInterface().report("property-set", [
      "Network Info",
      [
        ["id", this.config.network],
        ["port", this.config.networks[this.config.network].network_id],
        ["network", this.config.networks[this.config.network].port],
      ],
    ]);

    getUserInterface().report("header", ["Targets"]);

    // Run post-launch server hook;
    await this.api.onServerReady(this.config);

    const [included, excluded] = await loadTargets();

    if (!included.size) {
      // Finish
      await tearDownTempFolders(this.tempContractsDir, this.tempArtifactsDir);

      // Shut server down
      await this.api.finish();
      getUserInterface().error(
        `No targets where selected! Try changing the 'include' parameter`
      );
      process.exit(1);
    }

    let names = [];

    included.forEach((value, key) =>
      names.push(`${path.basename(key)} -> ${value.join(", ")}`)
    );
    getUserInterface().report("targets", names);
    names = [];
    excluded.forEach((value, key) =>
      names.push(`${path.basename(key)} -> ${value.join(", ")}`)
    );
    getUserInterface().report("skip-files", names);

    getUserInterface().report("header", ["this.configuration"]);

    getUserInterface().report("single-property", ["Seed", getSeed()]);
    getUserInterface().report("property-set", [
      "Budgets",
      [
        ["Iteration Budget", `${Properties.iteration_budget} iterations`],
        ["Evaluation Budget", `${Properties.evaluation_budget} evaluations`],
        ["Search Time Budget", `${Properties.search_time} seconds`],
        ["Total Time Budget", `${Properties.total_time} seconds`],
      ],
    ]);
    getUserInterface().report("property-set", [
      "Algorithm",
      [
        ["Algorithm", Properties.algorithm],
        ["Population Size", Properties.population_size],
      ],
    ]);
    getUserInterface().report("property-set", [
      "Variation Probabilities",
      [
        ["Resampling", Properties.resample_gene_probability],
        ["Delta mutation", Properties.delta_mutation_probability],
        [
          "Re-sampling from chromosome",
          Properties.sample_existing_value_probability,
        ],
        ["Crossover", Properties.crossover_probability],
      ],
    ]);

    getUserInterface().report("property-set", [
      "Sampling",
      [
        ["Max Depth", Properties.max_depth],
        ["Explore Illegal Values", Properties.explore_illegal_values],
        ["Sample Function Result as Argument", Properties.sample_func_as_arg],
        ["Crossover", Properties.crossover_probability],
      ],
    ]);

    const sourceGenerator = new SourceGenerator();
    const astGenerator = new ASTGenerator();
    const targetMapGenerator = new TargetMapGenerator();
    const cfgGenerator = new SolidityCFGFactory();
    this.targetPool = new TargetPool(
      sourceGenerator,
      astGenerator,
      targetMapGenerator,
      cfgGenerator
    );

    return [included, excluded];
  }

  async search(
    included: Map<string, string[]>,
    excluded: Map<string, string[]>
  ): Promise<
    [Archive<SolidityTestCase>, Map<string, string>, Map<string, string[]>]
  > {
    const targets: TargetFile[] = [];
    const skipped: TargetFile[] = [];

    for (const _path of included.keys()) {
      targets.push({
        source: this.targetPool.getSource(_path),
        canonicalPath: _path,
        relativePath: path.basename(_path),
      });
    }

    for (const _path of excluded.keys()) {
      targets.push({
        source: this.targetPool.getSource(_path),
        canonicalPath: _path,
        relativePath: path.basename(_path),
      });
    }

    // Instrument
    const instrumented = this.api.instrument(targets);

    await setupTempFolders(this.tempContractsDir, this.tempArtifactsDir);
    await save(
      instrumented,
      this.config.contracts_directory,
      this.tempContractsDir
    );
    await save(skipped, this.config.contracts_directory, this.tempContractsDir);

    this.config.contracts_directory = this.tempContractsDir;
    this.config.build_directory = this.tempArtifactsDir;

    this.config.contracts_build_directory = path.join(
      this.tempArtifactsDir,
      path.basename(this.config.contracts_build_directory)
    );

    this.config.all = true;
    this.config.compilers.solc.settings.optimizer.enabled = false;
    this.config.quiet = true;

    // Compile Instrumented Contracts
    await this.truffle.contracts.compile(this.config);
    await this.api.onCompileComplete(this.config);

    const finalArchive = new Archive<SolidityTestCase>();
    let finalImportsMap: Map<string, string> = new Map();
    let finalDependencies: Map<string, string[]> = new Map();

    for (const targetPath of included.keys()) {
      const includedTargets = included.get(targetPath);

      const targetMap = this.targetPool.getTargetMap(targetPath);
      for (const target of targetMap.keys()) {
        // check if included
        if (
          !includedTargets.includes("*") &&
          !includedTargets.includes(target)
        ) {
          continue;
        }

        // check if excluded
        if (excluded.has(targetPath)) {
          const excludedTargets = excluded.get(targetPath);
          if (
            excludedTargets.includes("*") ||
            excludedTargets.includes(target)
          ) {
            continue;
          }
        }

        const archive = await this.testTarget(
          this.targetPool,
          targetPath,
          target
        );
        const [
          importsMap,
          dependencyMap,
        ] = this.targetPool.getImportDependencies(targetPath, target);

        finalArchive.merge(archive);

        finalImportsMap = new Map([
          ...Array.from(finalImportsMap.entries()),
          ...Array.from(importsMap.entries()),
        ]);
        finalDependencies = new Map([
          ...Array.from(finalDependencies.entries()),
          ...Array.from(dependencyMap.entries()),
        ]);
      }
    }

    return [finalArchive, finalImportsMap, finalDependencies];
  }

  async finalize(
    finalArchive: Archive<SolidityTestCase>,
    finalImportsMap: Map<string, string>,
    finalDependencies: Map<string, string[]>
  ): Promise<void> {
    await createDirectoryStructure();
    await createTempDirectoryStructure();

    const testDir = path.resolve(Properties.final_suite_directory);
    await clearDirectory(testDir);

    const stringifier = new SolidityTruffleStringifier(
      finalImportsMap,
      finalDependencies
    );

    const suiteBuilder = new SoliditySuiteBuilder(
      stringifier,
      this.api,
      this.truffle,
      this.config
    );

    await suiteBuilder.createSuite(finalArchive as Archive<SolidityTestCase>);

    await deleteTempDirectories();

    this.config.test_files = await getTestFilePaths({
      testDir: testDir,
    });

    // Run tests
    // by replacing the console.log global function we disable the output of the truffle test results
    const old = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = function () {};
    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      getUserInterface().error(e);
      console.trace(e);
    }
    console.log = old;
    await this.api.onTestsComplete(this.config);

    getUserInterface().report("header", ["search results"]);

    // Run Istanbul
    await this.api.report();
    await this.api.onIstanbulComplete(this.config);
  }

  async testTarget(
    targetPool: TargetPool,
    targetPath: string,
    target: string
  ): Promise<Archive<SolidityTestCase>> {
    await createDirectoryStructure();

    const cfg = targetPool.getCFG(targetPath, target);

    if (Properties.draw_cfg) {
      // TODO dot's in the the name of a file will give issues
      drawGraph(
        cfg,
        path.join(
          Properties.cfg_directory,
          `${path.basename(targetPath).split(".")[0]}.svg`
        )
      );
    }

    try {
      await createDirectoryStructure();
      await createTempDirectoryStructure();

      getUserInterface().report("header", [
        `Searching: "${path.basename(targetPath)}"`,
      ]);

      const ast = targetPool.getAST(targetPath);
      const cfg = targetPool.getCFG(targetPath, target);

      const functionDescriptions = cfg.getFunctionDescriptions(target);

      const currentSubject = new SoliditySubject(
        path.basename(targetPath),
        target,
        cfg,
        functionDescriptions
      );

      const [importsMap, dependencyMap] = targetPool.getImportDependencies(
        targetPath,
        target
      );

      const stringifier = new SolidityTruffleStringifier(
        importsMap,
        dependencyMap
      );
      const suiteBuilder = new SoliditySuiteBuilder(
        stringifier,
        this.api,
        this.truffle,
        this.config
      );

      const runner = new SolidityRunner(
        suiteBuilder,
        this.api,
        this.truffle,
        this.config
      );

      // Parse the contract for extracting constant
      const pool = ConstantPool.getInstance();
      const constantVisitor = new ConstantVisitor(pool);
      SolidityParser.visit(ast, constantVisitor);

      const sampler = new SolidityRandomSampler(currentSubject);

      const crossover = new SolidityTreeCrossover();
      const algorithm = createAlgorithmFromConfig(sampler, runner, crossover);

      await suiteBuilder.clearDirectory(Properties.temp_test_directory);

      // allocate budget manager
      const iterationBudget = new IterationBudget(Properties.iteration_budget);
      const evaluationBudget = new EvaluationBudget();
      const searchBudget = new SearchTimeBudget(Properties.search_time);
      const totalTimeBudget = new TotalTimeBudget(Properties.total_time);
      const budgetManager = new BudgetManager();
      budgetManager.addBudget(iterationBudget);
      budgetManager.addBudget(evaluationBudget);
      budgetManager.addBudget(searchBudget);
      budgetManager.addBudget(totalTimeBudget);

      // Termination
      const terminationManager = configureTermination();

      // Collector
      const collector = new StatisticsCollector(totalTimeBudget);
      collectInitialVariables(collector, currentSubject, targetPath);

      // Statistics listener
      const statisticsSearchListener = new StatisticsSearchListener(collector);
      algorithm.addListener(statisticsSearchListener);

      // This searches for a covering population
      const archive = await algorithm.search(
        currentSubject,
        budgetManager,
        terminationManager
      );

      // Gather statistics after the search
      collectStatistics(
        collector,
        currentSubject,
        archive,
        totalTimeBudget,
        searchBudget,
        iterationBudget,
        evaluationBudget
      );

      collectCoverageData(collector, archive, "branch");
      collectCoverageData(collector, archive, "statement");
      collectCoverageData(collector, archive, "function");
      collectProbeCoverageData(collector, archive);

      const statisticsDirectory = path.resolve(Properties.statistics_directory);

      const summaryWriter = new SummaryWriter();
      summaryWriter.write(collector, statisticsDirectory + "/statistics.csv");

      const coverageWriter = new CoverageWriter();
      coverageWriter.write(collector, statisticsDirectory + "/coverage.csv");

      await deleteTempDirectories();

      return archive;
    } catch (e) {
      if (e instanceof SolidityParser.ParserError) {
        console.error(e.errors);
      }
      throw e;
    }
  }
}
