/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Solidity.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
  createTempDirectoryStructure,
  saveTempFiles,
} from "@syntest/framework";

import * as path from "path";
import TruffleConfig = require("@truffle/config");

import API = require("../src/api");

import { normalizeConfig } from "./util/config";
import { setNetwork, setNetworkFrom } from "./util/network";

import {
  createTruffleConfig,
  getTestFilePaths,
  loadLibrary,
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

import { SolidityTargetPool } from "./analysis/static/SolidityTargetPool";
import { SourceGenerator } from "./analysis/static/source/SourceGenerator";
import { ASTGenerator } from "./analysis/static/ast/ASTGenerator";
import { TargetMapGenerator } from "./analysis/static/map/TargetMapGenerator";
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
  private readonly tempArtifactsDir = path.join(
    process.cwd(),
    ".syntest/artifacts"
  );

  private api;
  private config;
  private truffle;

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
      const targetPool = await this.setup();
      const [archive, imports, dependencies] = await this.search(targetPool);
      await this.finalize(archive, imports, dependencies);
    } catch (e) {
      console.trace(e);
    }

    await this.exit();
  }

  async exit(): Promise<void> {
    // Finish
    await deleteTempDirectories();
    await tearDownTempFolders(this.tempArtifactsDir);

    // Shut server down
    await this.api.finish();

    process.exit(0);
  }

  async setup(): Promise<SolidityTargetPool> {
    // Filesystem & Compiler Re-configuration
    const additionalOptions = {}; // TODO
    setupOptions(this._program, additionalOptions);

    const index = process.argv.indexOf(
      process.argv.find((a) => a.includes(this._program))
    );

    const args = process.argv.slice(index + 1);

    const myConfig = loadConfig(args);

    processConfig(myConfig, args);
    setupLogger();
    await createDirectoryStructure();
    await createTempDirectoryStructure();
    await setupTempFolders(this.tempArtifactsDir);

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

    getUserInterface().report("clear", []);
    getUserInterface().report("asciiArt", ["Syntest"]);
    getUserInterface().report("version", [require("../package.json").version]);

    this.truffle = loadLibrary(this.config);
    this.api = new API(myConfig);

    if (args.includes("--help") || args.includes("-h")) {
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

    // Exit if --version
    if (args.includes("--version") || args.includes("-v")) {
      getUserInterface().report("versions", [
        this.truffle.version,
        ganacheVersion,
        pkg.version,
      ]);

      await this.exit();
    }

    setNetworkFrom(this.config, accounts);

    getUserInterface().report("header", ["GENERAL INFO"]);

    getUserInterface().report("property-set", [
      "Network Info",
      [
        ["id", this.config.network],
        ["port", this.config.networks[this.config.network].network_id],
        ["network", this.config.networks[this.config.network].port],
      ],
    ]);

    getUserInterface().report("header", ["TARGETS"]);

    // Run post-launch server hook;
    await this.api.onServerReady(this.config);

    const sourceGenerator = new SourceGenerator();
    const astGenerator = new ASTGenerator();
    const targetMapGenerator = new TargetMapGenerator();
    const cfgGenerator = new SolidityCFGFactory();
    const targetPool = new SolidityTargetPool(
      sourceGenerator,
      astGenerator,
      targetMapGenerator,
      cfgGenerator
    );

    await loadTargets(targetPool);

    if (!targetPool.included.length) {
      // Shut server down
      getUserInterface().error(
        `No targets where selected! Try changing the 'include' parameter`
      );
      await this.exit();
    }

    let names = [];

    targetPool.included.forEach((targetFile) =>
      names.push(
        `${path.basename(
          targetFile.canonicalPath
        )} -> ${targetFile.targets.join(", ")}`
      )
    );
    getUserInterface().report("targets", names);
    names = [];
    targetPool.excluded.forEach((targetFile) =>
      names.push(
        `${path.basename(
          targetFile.canonicalPath
        )} -> ${targetFile.targets.join(", ")}`
      )
    );
    getUserInterface().report("skip-files", names);

    getUserInterface().report("header", ["CONFIGURATION"]);

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

    return targetPool;
  }

  async search(
    targetPool: SolidityTargetPool
  ): Promise<
    [Archive<SolidityTestCase>, Map<string, string>, Map<string, string[]>]
  > {
    const excludedSet = new Set(
      ...targetPool.excluded.map((x) => x.canonicalPath)
    );

    // Instrument
    const instrumented = this.api.instrument(targetPool.targetFiles);

    await saveTempFiles(
      instrumented,
      this.config.contracts_directory,
      Properties.temp_instrumented_directory
    );
    // TODO remove
    await saveTempFiles(
      targetPool.excluded,
      this.config.contracts_directory,
      Properties.temp_instrumented_directory
    );

    this.config.contracts_directory = Properties.temp_instrumented_directory;
    this.config.build_directory = this.tempArtifactsDir;

    // TODO what?
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

    for (const targetFile of targetPool.included) {
      const includedTargets = targetFile.targets;

      const targetMap = targetPool.getTargetMap(targetFile.canonicalPath);
      for (const target of targetMap.keys()) {
        // check if included
        if (
          !includedTargets.includes("*") &&
          !includedTargets.includes(target)
        ) {
          continue;
        }

        // check if excluded
        if (excludedSet.has(targetFile.canonicalPath)) {
          const excludedTargets = targetPool.excluded.find(
            (x) => x.canonicalPath === targetFile.canonicalPath
          ).targets;
          if (
            excludedTargets.includes("*") ||
            excludedTargets.includes(target)
          ) {
            continue;
          }
        }

        const archive = await this.testTarget(
          targetPool,
          targetFile.canonicalPath,
          target
        );
        const [importsMap, dependencyMap] = targetPool.getImportDependencies(
          targetFile.canonicalPath,
          target
        );

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

    getUserInterface().report("header", ["SEARCH RESULTS"]);

    // Run Istanbul
    await this.api.report();
    await this.api.onIstanbulComplete(this.config);
  }

  async testTarget(
    targetPool: SolidityTargetPool,
    targetPath: string,
    target: string
  ): Promise<Archive<SolidityTestCase>> {
    const cfg = targetPool.getCFG(targetPath, target);

    if (Properties.draw_cfg) {
      drawGraph(
        cfg,
        path.join(
          Properties.cfg_directory,
          `${path.basename(targetPath, ".sol")}.svg`
        )
      );
    }

    try {
      getUserInterface().report("header", [
        `SEARCHING: "${path.basename(targetPath)}": "${target}"`,
      ]);

      const ast = targetPool.getAST(targetPath);

      const functionDescriptions = cfg.getFunctionDescriptions(target);

      const currentSubject = new SoliditySubject(
        path.basename(targetPath),
        target,
        cfg,
        functionDescriptions
      );

      if (!currentSubject.getPossibleActions().length) {
        getUserInterface().report("skipping", [currentSubject.name]);
        return new Archive();
      }

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

      await clearDirectory(Properties.temp_test_directory);
      await clearDirectory(Properties.temp_log_directory);

      return archive;
    } catch (e) {
      if (e instanceof SolidityParser.ParserError) {
        console.error(e.errors);
      }
      throw e;
    }
  }
}
