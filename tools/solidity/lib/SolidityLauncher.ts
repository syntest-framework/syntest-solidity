/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
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
import {
  ArgumentsObject,
  PluginType,
  CrossoverPlugin,
  FileSelector,
  Launcher,
  ObjectiveManagerPlugin,
  ProcreationPlugin,
  PropertyName,
  SearchAlgorithmPlugin,
  SecondaryObjectivePlugin,
  TargetSelector,
  TerminationTriggerPlugin,
} from "@syntest/base-language";
import { TestCommandOptions } from "./commands/test";
import {
  ItemizationItem,
  TableObject,
  UserInterface,
} from "@syntest/cli-graphics";
import { Logger, getLogger } from "@syntest/logging";
import { MetricManager } from "@syntest/metric";
import { ModuleManager } from "@syntest/module";
import { StorageManager } from "@syntest/storage";
import {
  Archive,
  EncodingSampler,
  IterationBudget,
  EvaluationBudget,
  SearchTimeBudget,
  TotalTimeBudget,
  BudgetManager,
  BudgetType,
  TerminationManager,
} from "@syntest/search";
import {
  SolidityDecoder,
  SolidityRandomSampler,
  SolidityRunner,
  SoliditySampler,
  SoliditySubject,
  SoliditySuiteBuilder,
  SolidityTestCase,
} from "@syntest/search-solidity";

import * as path from "node:path";


import { createTruffleConfig } from "./util/fileSystem";

import { setNetwork, setNetworkFrom } from "./util/network";
import { SourceFactory } from "@syntest/analysis";
import {
  AbstractSyntaxTreeFactory,
  ConstantPoolFactory,
  ControlFlowGraphFactory,
  DependencyFactory,
  Instrumenter,
  RootContext,
  TargetFactory,
  Target,
} from "@syntest/analysis-solidity";

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const TruffleConfig = require("@truffle/config");
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const API = require("./api");
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const Web3 = require("web3");

export type SolidityArguments = ArgumentsObject & TestCommandOptions;

export class SolidityLauncher extends Launcher {
  private static LOGGER: Logger;

  private targets: Target[];

  private rootContext: RootContext;
  private archive: Archive<SolidityTestCase>;

  private dependencyMap: Map<string, string[]>;

  private coveredInPath = new Map<string, Archive<SolidityTestCase>>();

  private decoder: SolidityDecoder;
  private runner: SolidityRunner;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private config: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private truffle: any;

  constructor(
    arguments_: SolidityArguments,
    moduleManager: ModuleManager,
    metricManager: MetricManager,
    storageManager: StorageManager,
    userInterface: UserInterface
  ) {
    super(
      arguments_,
      moduleManager,
      metricManager,
      storageManager,
      userInterface
    );
    SolidityLauncher.LOGGER = getLogger("SolidityLauncher");

    this.dependencyMap = new Map()
  }

  async initialize(): Promise<void> {
    SolidityLauncher.LOGGER.info("Initialization started");
    const start = Date.now();

    this.metricManager.recordProperty(
      PropertyName.CONSTANT_POOL_ENABLED,
      `${(<SolidityArguments>this.arguments_).constantPool.toString()}`
    );
    this.metricManager.recordProperty(
      PropertyName.CONSTANT_POOL_PROBABILITY,
      `${(<SolidityArguments>(
        this.arguments_
      )).constantPoolProbability.toString()}`
    );

    this.storageManager.deleteTemporaryDirectories([
      [this.arguments_.testDirectory],
      [this.arguments_.logDirectory],
      [this.arguments_.instrumentedDirectory],
    ]);

    SolidityLauncher.LOGGER.info("Creating directories");
    this.storageManager.createDirectories([
      [this.arguments_.testDirectory],
      [this.arguments_.statisticsDirectory],
      [this.arguments_.logDirectory],
    ]);

    SolidityLauncher.LOGGER.info("Creating temp directories");
    this.storageManager.createDirectories(
      [
        [this.arguments_.testDirectory],
        [this.arguments_.logDirectory],
        [this.arguments_.instrumentedDirectory],
        ["artifacts"], // TODO make config param
      ],
      true
    );

    const temporaryTestDirectory = path.join(
      this.arguments_.tempSyntestDirectory,
      this.arguments_.fid,
      this.arguments_.testDirectory
    );

    await createTruffleConfig(temporaryTestDirectory);
    const config = TruffleConfig.default();
    config.workingDir = config.working_directory;
    config.contractsDir = config.contracts_directory;
    config.testDir = config.test_directory;
    config.artifactsDir = config.build_directory;

    // eth-gas-reporter freezes the in-process client because it uses sync calls
    if (
      typeof config.mocha === "object" &&
      config.mocha.reporter === "eth-gas-reporter"
    ) {
      config.mocha.reporter = "spec";
      delete config.mocha.reporterOptions;
    }

    // Truffle V4 style solc settings are honored over V5 settings. Apparently it's common
    // for both to be present in the same config (as an error).
    if (typeof config.solc === "object") {
      config.solc.optimizer = { enabled: false };
    }

    config.testDir = temporaryTestDirectory;
    config.compilers = {
      solc: {
        version: (<SolidityArguments>(<unknown>this.arguments_))
          .solcCompilerVersion,
        parser: "solcjs",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2,
          },
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
    const truffle = require("truffle");
    const api = new API(config);

    setNetwork(config, api);

    // Server launch
    const client = api.client || truffle.ganache;
    const address = await api.ganache(client);

    const web3 = new Web3(address);
    const accounts = await web3.eth.getAccounts();
    // const nodeInfo = await web3.eth.getNodeInfo();

    setNetworkFrom(config, accounts);

    // Run post-launch server hook;
    await api.onServerReady(config);

    // TODO rootcontext

    const sourceFactory = new SourceFactory();
    const abstractSyntaxTreeFactory = new AbstractSyntaxTreeFactory();
    const targetFactory = new TargetFactory(
      (<SolidityArguments>this.arguments_).syntaxForgiving
    );
    const controlFlowGraphFactory = new ControlFlowGraphFactory(
      (<SolidityArguments>this.arguments_).syntaxForgiving
    );
    const dependencyFactory = new DependencyFactory(
      (<SolidityArguments>this.arguments_).syntaxForgiving
    );

    const constantPoolFactory = new ConstantPoolFactory(
      (<SolidityArguments>this.arguments_).syntaxForgiving
    );

    const fileSelector = new FileSelector();
    const targetFiles = fileSelector.loadFilePaths(
      this.arguments_.targetInclude,
      this.arguments_.targetExclude
    );

    if (this.arguments_.analysisInclude.length === 0) {
      SolidityLauncher.LOGGER.warn(
        "'analysis-include' config parameter is empty so we only use the target files for analysis"
      );
    }

    for (const target of targetFiles) {
      if (this.arguments_.analysisExclude.includes(target)) {
        throw new Error(
          `Target files cannot be excluded from analysis. Target file: ${target}`
        );
      }
    }

    const analysisFiles = fileSelector.loadFilePaths(
      [...targetFiles, ...this.arguments_.analysisInclude],
      this.arguments_.analysisExclude
    );

    this.rootContext = new RootContext(
      this.arguments_.targetRootDirectory,
      sourceFactory,
      targetFiles,
      analysisFiles,
      abstractSyntaxTreeFactory,
      controlFlowGraphFactory,
      targetFactory,
      dependencyFactory,
      constantPoolFactory
    );

    this.userInterface.printHeader("GENERAL INFO");

    const selectionSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Network", config.network],
        ["Network id", config.networks[config.network].network_id],
        ["Network port", config.networks[config.network].port],
      ],
      footers: ["", ""],
    };
    this.userInterface.printTable("SELECTION SETTINGS", selectionSettings);

    const timeInMs = (Date.now() - start) / 1000;
    this.metricManager.recordProperty(
      PropertyName.INITIALIZATION_TIME,
      `${timeInMs}`
    );

    this.api = api;
    this.config = config;
    this.truffle = truffle;

    SolidityLauncher.LOGGER.info("Initialization done");
  }

  async preprocess(): Promise<void> {
    SolidityLauncher.LOGGER.info("Preprocessing started");
    const startPreProcessing = Date.now();

    const startTargetSelection = Date.now();
    const targetSelector = new TargetSelector(this.rootContext);
    this.targets = <Target[]>targetSelector.loadTargets(
      this.arguments_.targetInclude,
      this.arguments_.targetExclude
    );
    let timeInMs = (Date.now() - startTargetSelection) / 1000;
    this.metricManager.recordProperty(
      PropertyName.TARGET_LOAD_TIME,
      `${timeInMs}`
    );

    if (this.targets.length === 0) {
      // Shut server down
      this.userInterface.printError(
        `No targets where selected! Try changing the 'target-include' parameter`
      );
      await this.exit();
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit();
    }

    const itemization: ItemizationItem[] = [];

    for (const target of this.targets) {
      itemization.push({
        text: `${target.path}: ${target.name} #${target.subTargets.length}`,
        subItems: target.subTargets.map((subtarget) => {
          return {
            text: `${subtarget.type} ${subtarget.id}`,
          };
        }),
      });
    }

    this.userInterface.printItemization("TARGETS", itemization);

    const selectionSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Target Root Directory", this.arguments_.targetRootDirectory],
        ["Target Include", `${this.arguments_.targetInclude.join(", ")}`],
        ["Target Exclude", `${this.arguments_.targetExclude.join(", ")}`],
        ["Analysis Include", `${this.arguments_.analysisInclude.join(", ")}`],
        ["Analysis Exclude", `${this.arguments_.analysisExclude.join(", ")}`],
      ],
      footers: ["", ""],
    };
    this.userInterface.printTable("SELECTION SETTINGS", selectionSettings);

    const settings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Preset", this.arguments_.preset],
        ["Search Algorithm", this.arguments_.searchAlgorithm],
        ["Population Size", `${this.arguments_.populationSize}`],
        ["Objective Manager", `${this.arguments_.objectiveManager}`],
        ["Secondary Objectives", `${this.arguments_.secondaryObjectives}`],
        ["Procreation Operator", `${this.arguments_.procreation}`],
        ["Crossover Operator", `${this.arguments_.crossover}`],
        ["Sampling Operator", `${this.arguments_.sampler}`],
        ["Termination Triggers", `${this.arguments_.terminationTriggers}`],
        ["Test Minimization Enabled", `${this.arguments_.testMinimization}`],

        ["Seed", `${this.arguments_.randomSeed.toString()}`],
      ],
      footers: ["", ""],
    };

    this.userInterface.printTable("SETTINGS", settings);

    const budgetSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Iteration Budget", `${this.arguments_.iterations} iterations`],
        ["Evaluation Budget", `${this.arguments_.evaluations} evaluations`],
        ["Search Time Budget", `${this.arguments_.searchTime} seconds`],
        ["Total Time Budget", `${this.arguments_.totalTime} seconds`],
      ],
      footers: ["", ""],
    };

    this.userInterface.printTable("BUDGET SETTINGS", budgetSettings);

    const mutationSettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        [
          "Delta Mutation Probability",
          `${this.arguments_.deltaMutationProbability}`,
        ],
        ["Crossover Probability", `${this.arguments_.crossoverProbability}`],
        [
          "Multi-point Crossover Probability",
          `${this.arguments_.multiPointCrossoverProbability}`,
        ],
        // sampling
        ["Max Depth", `${this.arguments_.maxDepth}`],
        ["Max Action Statements", `${this.arguments_.maxActionStatements}`],
        ["Explore Illegal Values", `${this.arguments_.exploreIllegalValues}`],
        [
          "Use Constant Pool Values",
          `${(<SolidityArguments>this.arguments_).constantPool}`,
        ],
        [
          "Use Constant Pool Probability",
          `${(<SolidityArguments>this.arguments_).constantPoolProbability}`,
        ],
        [
          "Use Statement Pool Values",
          `${(<SolidityArguments>this.arguments_).statementPool}`,
        ],
        [
          "Use Statement Pool Probability",
          `${(<SolidityArguments>this.arguments_).statementPoolProbability}`,
        ],
      ],
      footers: ["", ""],
    };
    this.userInterface.printTable("MUTATION SETTINGS", mutationSettings);

    const directorySettings: TableObject = {
      headers: ["Setting", "Value"],
      rows: [
        ["Syntest Directory", `${this.arguments_.syntestDirectory}`],
        ["Temporary Directory", `${this.arguments_.tempSyntestDirectory}`],
        ["Target Root Directory", `${this.arguments_.targetRootDirectory}`],
      ],
      footers: ["", ""],
    };

    this.userInterface.printTable("DIRECTORY SETTINGS", directorySettings);

    SolidityLauncher.LOGGER.info("Instrumenting targets");
    const startInstrumentation = Date.now();
    const instrumenter = new Instrumenter();
    await instrumenter.instrumentAll(
      this.storageManager,
      this.rootContext,
      this.targets,
      this.arguments_.instrumentedDirectory,
      this.api
    );
    timeInMs = (Date.now() - startInstrumentation) / 1000;
    this.metricManager.recordProperty(
      PropertyName.INSTRUMENTATION_TIME,
      `${timeInMs}`
    );

    timeInMs = (Date.now() - startPreProcessing) / 1000;
    this.metricManager.recordProperty(
      PropertyName.PREPROCESS_TIME,
      `${timeInMs}`
    );

    for (const target of this.targets) {
      this.dependencyMap.set(target.name, this.rootContext.getDependencies(target.path))
    }

    this.decoder = new SolidityDecoder(
      path.join(
        this.arguments_.tempSyntestDirectory,
        this.arguments_.fid,
        this.arguments_.logDirectory
      ),
      this.dependencyMap
    );

    this.runner = new SolidityRunner(
      this.storageManager,
      this.decoder,
      this.arguments_.testDirectory,
      (<SolidityArguments>this.arguments_).executionTimeout,
      (<SolidityArguments>this.arguments_).testTimeout,
      (<SolidityArguments>this.arguments_).silenceTestOutput,
      this.api,
      this.truffle,
      this.config
    );

    SolidityLauncher.LOGGER.info("Preprocessing done");
  }

  async process(): Promise<void> {
    SolidityLauncher.LOGGER.info("Processing started");
    const start = Date.now();
    this.archive = new Archive<SolidityTestCase>();
    this.dependencyMap = new Map();

    for (const target of this.targets) {
      SolidityLauncher.LOGGER.info(`Processing ${target.name}`);
      const archive = await this.testTarget(this.rootContext, target);

      const dependencies = this.rootContext.getDependencies(target.path);
      this.archive.merge(archive);

      this.dependencyMap.set(target.name, dependencies);
    }
    SolidityLauncher.LOGGER.info("Processing done");
    const timeInMs = (Date.now() - start) / 1000;
    this.metricManager.recordProperty(PropertyName.PROCESS_TIME, `${timeInMs}`);
  }

  async postprocess(): Promise<void> {
    SolidityLauncher.LOGGER.info("Postprocessing started");
    const start = Date.now();

    const suiteBuilder = new SoliditySuiteBuilder(
      this.storageManager,
      this.decoder,
      this.runner,
      this.arguments_.logDirectory
    );

    const reducedArchive = suiteBuilder.reduceArchive(this.archive);

    if (this.archive.size === 0) {
      throw new Error("Zero tests were created");
    }

    // TODO fix hardcoded paths
    let paths = suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      this.arguments_.testDirectory,
      true,
      false
    );
    this.config.test_files = paths;
    await suiteBuilder.runSuite(paths, this.archive.size);

    // reset states
    this.storageManager.clearTemporaryDirectory([
      this.arguments_.testDirectory,
    ]);

    // run with assertions and report results
    for (const key of reducedArchive.keys()) {
      suiteBuilder.gatherAssertions(reducedArchive.get(key));
    }

    paths = suiteBuilder.createSuite(
      reducedArchive,
      "../instrumented",
      this.arguments_.testDirectory,
      false,
      true
    );
    const { stats, instrumentationData } = await suiteBuilder.runSuite(
      paths,
      this.archive.size
    );

    if (stats.failures > 0) {
      this.userInterface.printError("Test case has failed!");
    }

    this.userInterface.printHeader("SEARCH RESULTS");

    const table: TableObject = {
      headers: ["Target", "Statement", "Branch", "Function", "File"],
      rows: [],
      footers: ["Average"],
    };

    const overall = {
      branch: 0,
      statement: 0,
      function: 0,
    };
    let totalBranches = 0;
    let totalStatements = 0;
    let totalFunctions = 0;
    for (const file of Object.keys(instrumentationData)) {
      const target = this.targets.find(
        (target: Target) => target.path === file
      );
      if (!target) {
        continue;
      }

      const data = instrumentationData[file];

      const summary = {
        branch: 0,
        statement: 0,
        function: 0,
      };

      for (const statementKey of Object.keys(data.s)) {
        summary["statement"] += data.s[statementKey] ? 1 : 0;
        overall["statement"] += data.s[statementKey] ? 1 : 0;
      }

      for (const branchKey of Object.keys(data.b)) {
        summary["branch"] += data.b[branchKey][0] ? 1 : 0;
        overall["branch"] += data.b[branchKey][0] ? 1 : 0;
        summary["branch"] += data.b[branchKey][1] ? 1 : 0;
        overall["branch"] += data.b[branchKey][1] ? 1 : 0;
      }

      for (const functionKey of Object.keys(data.f)) {
        summary["function"] += data.f[functionKey] ? 1 : 0;
        overall["function"] += data.f[functionKey] ? 1 : 0;
      }

      totalStatements += Object.keys(data.s).length;
      totalBranches += Object.keys(data.b).length * 2;
      totalFunctions += Object.keys(data.f).length;

      table.rows.push([
        `${path.basename(target.path)}: ${target.name}`,
        summary["statement"] + " / " + Object.keys(data.s).length,
        summary["branch"] + " / " + Object.keys(data.b).length * 2,
        summary["function"] + " / " + Object.keys(data.f).length,
        target.path,
      ]);
    }

    this.metricManager.recordProperty(
      PropertyName.BRANCHES_COVERED,
      `${overall["branch"]}`
    );
    this.metricManager.recordProperty(
      PropertyName.STATEMENTS_COVERED,
      `${overall["statement"]}`
    );
    this.metricManager.recordProperty(
      PropertyName.FUNCTIONS_COVERED,
      `${overall["function"]}`
    );
    this.metricManager.recordProperty(
      PropertyName.BRANCHES_TOTAL,
      `${totalBranches}`
    );
    this.metricManager.recordProperty(
      PropertyName.STATEMENTS_TOTAL,
      `${totalStatements}`
    );
    this.metricManager.recordProperty(
      PropertyName.FUNCTIONS_TOTAL,
      `${totalFunctions}`
    );

    // other results
    this.metricManager.recordProperty(
      PropertyName.ARCHIVE_SIZE,
      `${this.archive.size}`
    );
    this.metricManager.recordProperty(
      PropertyName.MINIMIZED_ARCHIVE_SIZE,
      `${this.archive.size}`
    );

    overall["statement"] /= totalStatements;
    if (totalStatements === 0) overall["statement"] = 1;

    overall["branch"] /= totalBranches;
    if (totalBranches === 0) overall["branch"] = 1;

    overall["function"] /= totalFunctions;
    if (totalFunctions === 0) overall["function"] = 1;

    table.footers.push(
      overall["statement"] * 100 + " %",
      overall["branch"] * 100 + " %",
      overall["function"] * 100 + " %",
      ""
    );

    const originalSourceDirectory = path
      .join(
        "../../",
        path.relative(process.cwd(), this.arguments_.targetRootDirectory)
      )
      .replace(path.basename(this.arguments_.targetRootDirectory), "");

    this.userInterface.printTable("Coverage", table);

    // create final suite
    suiteBuilder.createSuite(
      reducedArchive,
      originalSourceDirectory,
      this.arguments_.testDirectory,
      false,
      true,
      true
    );
    SolidityLauncher.LOGGER.info("Postprocessing done");
    const timeInMs = (Date.now() - start) / 1000;
    this.metricManager.recordProperty(
      PropertyName.POSTPROCESS_TIME,
      `${timeInMs}`
    );
  }

  private async testTarget(
    rootContext: RootContext,
    target: Target
  ): Promise<Archive<SolidityTestCase>> {
    SolidityLauncher.LOGGER.info(
      `Testing target ${target.name} in ${target.path}`
    );
    const currentSubject = new SoliditySubject(
      target,
      this.rootContext,
      (<SolidityArguments>this.arguments_).syntaxForgiving,
      this.arguments_.stringAlphabet
    );

    const rootTargets = currentSubject.getActionableTargets();

    if (rootTargets.length === 0) {
      SolidityLauncher.LOGGER.info(
        `No actionable exported root targets found for ${target.name} in ${target.path}`
      );
      // report skipped
      return new Archive();
    }

    const dependencies = rootContext.getDependencies(target.path);
    const dependencyMap = new Map<string, string[]>();
    dependencyMap.set(target.name, dependencies);

    const constantPool = rootContext.getConstantPool(target.path);

    const sampler = new SolidityRandomSampler(
      currentSubject,
      constantPool,
      (<SolidityArguments>this.arguments_).constantPool,
      (<SolidityArguments>this.arguments_).constantPoolProbability,
      (<SolidityArguments>this.arguments_).statementPool,
      (<SolidityArguments>this.arguments_).statementPoolProbability,
      this.arguments_.maxActionStatements,
      this.arguments_.stringAlphabet,
      this.arguments_.stringMaxLength,
      this.arguments_.deltaMutationProbability,
      this.arguments_.exploreIllegalValues,
      (<SolidityArguments>this.arguments_).numericDecimals
    );
    sampler.rootContext = rootContext;

    const secondaryObjectives = new Set(
      this.arguments_.secondaryObjectives.map((secondaryObjective) => {
        return (<SecondaryObjectivePlugin<SolidityTestCase>>(
          this.moduleManager.getPlugin(
            PluginType.SecondaryObjective,
            secondaryObjective
          )
        )).createSecondaryObjective();
      })
    );

    const objectiveManager = (<ObjectiveManagerPlugin<SolidityTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.ObjectiveManager,
        this.arguments_.objectiveManager
      )
    )).createObjectiveManager({
      runner: this.runner,
      secondaryObjectives: secondaryObjectives,
    });

    const crossover = (<CrossoverPlugin<SolidityTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.Crossover,
        this.arguments_.crossover
      )
    )).createCrossoverOperator({
      crossoverEncodingProbability: this.arguments_.crossoverProbability,
      crossoverStatementProbability:
        this.arguments_.multiPointCrossoverProbability,
    });

    const procreation = (<ProcreationPlugin<SolidityTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.Procreation,
        this.arguments_.procreation
      )
    )).createProcreationOperator({
      crossover: crossover,
      mutateFunction: (
        sampler: EncodingSampler<SolidityTestCase>,
        encoding: SolidityTestCase
      ) => {
        return encoding.mutate(<SoliditySampler>(<unknown>sampler));
      },
      sampler: sampler,
    });

    const algorithm = (<SearchAlgorithmPlugin<SolidityTestCase>>(
      this.moduleManager.getPlugin(
        PluginType.SearchAlgorithm,
        this.arguments_.searchAlgorithm
      )
    )).createSearchAlgorithm({
      objectiveManager: objectiveManager,
      encodingSampler: sampler,
      procreation: procreation,
      populationSize: this.arguments_.populationSize,
    });

    this.storageManager.clearTemporaryDirectory([
      this.arguments_.testDirectory,
    ]);

    // allocate budget manager
    const iterationBudget = new IterationBudget(this.arguments_.iterations);
    const evaluationBudget = new EvaluationBudget(this.arguments_.evaluations);
    const searchBudget = new SearchTimeBudget(this.arguments_.searchTime);
    const totalTimeBudget = new TotalTimeBudget(this.arguments_.totalTime);
    const budgetManager = new BudgetManager();
    budgetManager.addBudget(BudgetType.ITERATION, iterationBudget);
    budgetManager.addBudget(BudgetType.EVALUATION, evaluationBudget);
    budgetManager.addBudget(BudgetType.SEARCH_TIME, searchBudget);
    budgetManager.addBudget(BudgetType.TOTAL_TIME, totalTimeBudget);

    // Termination
    const terminationManager = new TerminationManager();

    for (const trigger of this.arguments_.terminationTriggers) {
      terminationManager.addTrigger(
        (<TerminationTriggerPlugin>(
          this.moduleManager.getPlugin(PluginType.TerminationTrigger, trigger)
        )).createTerminationTrigger({
          objectiveManager: objectiveManager,
          encodingSampler: sampler,
          runner: this.runner,
          crossover: crossover,
          populationSize: this.arguments_.populationSize,
        })
      );
    }

    // This searches for a covering population
    const archive = await algorithm.search(
      currentSubject,
      budgetManager,
      terminationManager
    );

    if (this.coveredInPath.has(target.path)) {
      archive.merge(this.coveredInPath.get(target.path));
      this.coveredInPath.set(target.path, archive);
    } else {
      this.coveredInPath.set(target.path, archive);
    }

    this.storageManager.clearTemporaryDirectory([this.arguments_.logDirectory]);
    this.storageManager.clearTemporaryDirectory([
      this.arguments_.testDirectory,
    ]);

    // timing and iterations/evaluations
    this.metricManager.recordProperty(
      PropertyName.TOTAL_TIME,
      `${budgetManager.getBudgetObject(BudgetType.TOTAL_TIME).getUsedBudget()}`
    );
    this.metricManager.recordProperty(
      PropertyName.SEARCH_TIME,
      `${budgetManager.getBudgetObject(BudgetType.SEARCH_TIME).getUsedBudget()}`
    );
    this.metricManager.recordProperty(
      PropertyName.EVALUATIONS,
      `${budgetManager.getBudgetObject(BudgetType.EVALUATION).getUsedBudget()}`
    );
    this.metricManager.recordProperty(
      PropertyName.ITERATIONS,
      `${budgetManager.getBudgetObject(BudgetType.ITERATION).getUsedBudget()}`
    );

    SolidityLauncher.LOGGER.info(
      `Finished testing target ${target.name} in ${target.path}`
    );
    return archive;
  }

  async exit(): Promise<void> {
    SolidityLauncher.LOGGER.info("Exiting");

    // Shut server down
    await this.api.finish();

    // TODO should be cleanup step in tool
    // Finish
    SolidityLauncher.LOGGER.info("Deleting temporary directories");
    this.storageManager.deleteTemporaryDirectories([
      [this.arguments_.testDirectory],
      [this.arguments_.logDirectory],
      [this.arguments_.instrumentedDirectory],
    ]);

    this.storageManager.deleteMainTemporary();
  }
}
