/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
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
import { SolidityDecoder } from "./testbuilding/SolidityDecoder";
import { SoliditySuiteBuilder } from "./testbuilding/SoliditySuiteBuilder";
import { SolidityRunner } from "./testcase/execution/SolidityRunner";
import { SolidityRandomSampler } from "./testcase/sampling/SolidityRandomSampler";
import { SolidityCFGFactory } from "./graph/SolidityCFGFactory";
import SolidityParser = require("@solidity-parser/parser");

import {
  Archive,
  BudgetManager,
  CoverageWriter,
  createDirectoryStructure,
  deleteTempDirectories,
  EvaluationBudget,
  IterationBudget,
  SearchTimeBudget,
  StatisticsCollector,
  StatisticsSearchListener,
  SummaryWriter,
  TotalTimeBudget,
  getSeed,
  clearDirectory,
  createTempDirectoryStructure,
  Target,
  Launcher,
  ArgumentsObject,
  CONFIG,
  EventManager,
  PluginManager,
  createSearchAlgorithmFromConfig,
  createTerminationManagerFromConfig,
} from "@syntest/search";

import * as path from "path";
import TruffleConfig = require("@truffle/config");

import API = require("../src/api");

import { normalizeConfig } from "./util/config";
import { setNetwork, setNetworkFrom } from "./util/network";

import {
  createTruffleConfig,
  getTestFilePaths,
  setupTempFolders,
} from "./util/fileSystem";

import Messages from "./ui/Messages";
import { SolidityCommandLineInterface } from "./ui/SolidityCommandLineInterface";

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
import Yargs = require("yargs");
import { RemoveIndex } from "@syntest/search";
import { LOGGER } from "@syntest/search/lib/util/logger";

// eslint-disable-next-line
const pkg = require("../package.json");
// eslint-disable-next-line
const Web3 = require("web3");

export interface SolidityArguments
  extends Readonly<RemoveIndex<ArgumentsObject>> {
  solcCompilerVersion: string;
  probeObjective: boolean;
  modifierExtraction: boolean;
  numericDecimals: number;
  numericSigned: boolean;
}

export class SolidityLauncher extends Launcher<SolidityTestCase> {
  private importsMap: Map<string, string>;
  private dependencyMap: Map<string, Target[]>;

  private api;
  private config;
  private truffle;

  private readonly tempArtifactsDir = path.join(
    process.cwd(),
    ".syntest/artifacts"
  );

  constructor(
    programName: string,
    eventManager: EventManager<SolidityTestCase>,
    pluginManager: PluginManager<SolidityTestCase>
  ) {
    super(programName, eventManager, pluginManager);
    this.importsMap = new Map();
    this.dependencyMap = new Map();
  }

  addOptions<Y>(yargs: Yargs.Argv<Y>): Yargs.Argv<Y> {
    return yargs
      .options("solc-compiler-version", {
        alias: [],
        demandOption: true,
        description: "Solc compiler version",
        group: "Solidity Options:",
        hidden: false,
        type: "string",
      })
      .options("probe-objective", {
        alias: [],
        default: false,
        description: "Enable the probe objectives",
        group: "Solidity Options:",
        hidden: false,
        type: "boolean",
      })
      .options("modifier-extraction", {
        alias: [],
        default: false,
        description: "Enable modifier extraction",
        group: "Solidity Options:",
        hidden: false,
        type: "boolean",
      })
      .options("numeric-decimals", {
        alias: [],
        default: 64,
        description: "Number of decimals placed used by the numeric gene.",
        group: "Solidity Options:",
        hidden: false,
        type: "number",
      })
      .options("numeric-signed", {
        alias: [],
        default: true,
        description: "Whether the numeric genes are signed.",
        group: "Solidity Options:",
        hidden: false,
        type: "boolean",
      });
  }

  async initialize(): Promise<void> {
    await createTruffleConfig();
    this.config = normalizeConfig(TruffleConfig.default());

    await createDirectoryStructure();
    await createTempDirectoryStructure();
    await setupTempFolders(this.tempArtifactsDir);

    this.config.testDir = path.join(process.cwd(), CONFIG.tempTestDirectory);

    this.userInterface.clear();
    this.userInterface.asciiArt("SynTest Solidity " + pkg.version);
    // LOGGER.report("version", [pkg.version]);

    this.config.compilers = {
      solc: {
        version: (<SolidityArguments>(<unknown>CONFIG)).solcCompilerVersion,
        parser: "solcjs",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2,
          },
        },
      },
    };
    this.truffle = require("truffle");
    this.api = new API(this.config);

    setNetwork(this.config, this.api);

    // Server launch
    const client = this.api.client || this.truffle.ganache;
    const address = await this.api.ganache(client);

    const web3 = new Web3(address);
    const accounts = await web3.eth.getAccounts();
    // const nodeInfo = await web3.eth.getNodeInfo();

    setNetworkFrom(this.config, accounts);

    this.userInterface.header("GENERAL INFO");

    this.userInterface.subheader("Network Info");
    this.userInterface.property("id", `${this.config.network}`);
    this.userInterface.property(
      "port",
      `${this.config.networks[this.config.network].network_id}`
    );
    this.userInterface.property(
      "network",
      `${this.config.networks[this.config.network].port}`
    );

    this.userInterface.header("TARGETS");

    // Run post-launch server hook;
    await this.api.onServerReady(this.config);

    const sourceGenerator = new SourceGenerator();
    const astGenerator = new ASTGenerator();
    const targetMapGenerator = new TargetMapGenerator();
    const cfgGenerator = new SolidityCFGFactory();
    const rootContext = new SolidityTargetPool(
      this.eventManager,
      sourceGenerator,
      astGenerator,
      targetMapGenerator,
      cfgGenerator
    );

    this.programState.rootContext = rootContext;
  }

  async preprocess(): Promise<void> {
    this.programState.rootContext.loadTargets();

    if (!this.programState.rootContext.targets.length) {
      // Shut server down
      LOGGER.error(
        `No targets where selected! Try changing the 'include' parameter`
      );
      await this.exit();
    }

    this.userInterface.subheader("Included");
    this.userInterface.subheader("=====================");
    this.programState.rootContext.targets.forEach((target) =>
      this.userInterface.property(
        path.basename(target.canonicalPath),
        target.targetName
      )
    );
    this.userInterface.subheader("=====================");

    this.userInterface.header("CONFIGURATION");

    this.userInterface.property("Seed", `${getSeed()}`);
    this.userInterface.subheader("Budgets");
    this.userInterface.property(
      "Iteration Budget",
      `${CONFIG.iterationBudget} iterations`
    );
    this.userInterface.property(
      "Evaluation Budget",
      `${CONFIG.evaluationBudget} evaluations`
    );
    this.userInterface.property(
      "Search Time Budget",
      `${CONFIG.searchTimeBudget} seconds`
    );
    this.userInterface.property(
      "Total Time Budget",
      `${CONFIG.totalTimeBudget} seconds`
    );
    this.userInterface.subheader("Algorithm");
    this.userInterface.property("Algorithm", `${CONFIG.algorithm}`);
    this.userInterface.property("Population Size", `${CONFIG.populationSize}`);
    this.userInterface.subheader("Variation Probabilities");
    this.userInterface.property(
      "Resampling",
      `${CONFIG.resampleGeneProbability}`
    );
    this.userInterface.property(
      "Delta mutation",
      `${CONFIG.deltaMutationProbability}`
    );
    this.userInterface.property(
      "Re-sampling from chromosome",
      `${CONFIG.sampleExistingValueProbability}`
    );
    this.userInterface.property("Crossover", `${CONFIG.crossoverProbability}`);
    this.userInterface.subheader("Sampling");
    this.userInterface.property("Max Depth", `${CONFIG.maxDepth}`);
    this.userInterface.property(
      "Explore Illegal Values",
      `${CONFIG.exploreIllegalValues}`
    );
    this.userInterface.property(
      "Sample Function Result as Argument",
      `${CONFIG.sampleFunctionOutputAsArgument}`
    );
    this.userInterface.property("Crossover", `${CONFIG.crossoverProbability}`);

    // Instrument
    await (<SolidityTargetPool>(
      this.programState.rootContext
    )).prepareAndInstrument(this.api);

    this.config.contracts_directory = CONFIG.tempInstrumentedDirectory;
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
  }

  async process(): Promise<void> {
    this.programState.archive = new Archive<SolidityTestCase>();
    this.importsMap = new Map();
    this.dependencyMap = new Map();

    for (const target of this.programState.rootContext.targets) {
      const archive = await this.testTarget(
        <SolidityTargetPool>this.programState.rootContext,
        target.canonicalPath,
        target.targetName
      );
      const { importMap, dependencyMap } = (<SolidityTargetPool>(
        this.programState.rootContext
      )).getImportDependencies(target.canonicalPath, target.targetName);

      this.programState.archive.merge(archive);

      this.importsMap = new Map([
        ...Array.from(this.importsMap.entries()),
        ...Array.from(importMap.entries()),
      ]);
      this.dependencyMap = new Map([
        ...Array.from(this.dependencyMap.entries()),
        ...Array.from(dependencyMap.entries()),
      ]);
    }
  }

  async postprocess(): Promise<void> {
    const testDir = path.resolve(CONFIG.finalSuiteDirectory);
    await clearDirectory(testDir);

    const stringifier = new SolidityDecoder(
      this.importsMap,
      this.dependencyMap
    );

    const suiteBuilder = new SoliditySuiteBuilder(
      stringifier,
      this.api,
      this.truffle,
      this.config
    );

    await suiteBuilder.createSuite(this.programState.archive);

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
      LOGGER.error(e);
      console.trace(e);
    }
    console.log = old;
    await this.api.onTestsComplete(this.config);

    this.userInterface.header("SEARCH RESULTS");

    // Run Istanbul
    await this.api.report();
    await this.api.onIstanbulComplete(this.config);
  }

  async testTarget(
    rootContext: SolidityTargetPool,
    targetPath: string,
    target: string
  ): Promise<Archive<SolidityTestCase>> {
    try {
      this.userInterface.header(
        `SEARCHING: "${path.basename(targetPath)}": "${target}"`
      );

      const ast = rootContext.getAST(targetPath);
      const cfg = rootContext.getCFG(targetPath, target);

      const functionMap = rootContext.getFunctionMapSpecific(
        targetPath,
        target
      );

      const currentSubject = new SoliditySubject(
        path.basename(targetPath),
        target,
        cfg,
        [...functionMap.values()]
      );

      if (!currentSubject.getPossibleActions().length) {
        this.userInterface.property("skipping", currentSubject.name);
        return new Archive();
      }

      const { importMap, dependencyMap } = rootContext.getImportDependencies(
        targetPath,
        target
      );

      const stringifier = new SolidityDecoder(importMap, dependencyMap);
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
      const algorithm = createSearchAlgorithmFromConfig(
        this.pluginManager,
        null,
        sampler,
        runner,
        crossover
      );

      await suiteBuilder.clearDirectory(CONFIG.tempTestDirectory);

      // allocate budget manager
      const iterationBudget = new IterationBudget(CONFIG.iterationBudget);
      const evaluationBudget = new EvaluationBudget(CONFIG.evaluationBudget);
      const searchBudget = new SearchTimeBudget(CONFIG.searchTimeBudget);
      const totalTimeBudget = new TotalTimeBudget(CONFIG.totalTimeBudget);
      const budgetManager = new BudgetManager();
      budgetManager.addBudget(iterationBudget);
      budgetManager.addBudget(evaluationBudget);
      budgetManager.addBudget(searchBudget);
      budgetManager.addBudget(totalTimeBudget);

      // Termination
      const terminationManager = createTerminationManagerFromConfig(
        this.pluginManager
      );

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

      const statisticsDirectory = path.resolve(CONFIG.statisticsDirectory);

      const summaryWriter = new SummaryWriter();
      summaryWriter.write(collector, statisticsDirectory + "/statistics.csv");

      const coverageWriter = new CoverageWriter();
      coverageWriter.write(collector, statisticsDirectory + "/coverage.csv");

      await clearDirectory(CONFIG.tempTestDirectory);
      await clearDirectory(CONFIG.tempLogDirectory);

      return archive;
    } catch (e) {
      if (e instanceof SolidityParser.ParserError) {
        console.error(e.errors);
      }
      throw e;
    }
  }

  async exit(): Promise<void> {
    // Finish
    await deleteTempDirectories();

    // Shut server down
    await this.api.finish();

    process.exit(0);
  }
}
