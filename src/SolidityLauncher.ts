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
  ExceptionObjectiveFunction,
  ExecutionResult,
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
  StatisticsSearchListener,
  SummaryWriter,
  TotalTimeBudget,
  loadTargetFiles,
  TargetFile,
  CFG,
  setUserInterface,
  getUserInterface,
  AbstractTestCase,
  getSeed,
} from "syntest-framework";

import * as path from "path";
import TruffleConfig = require("@truffle/config");

import API = require("../src/api");

import { normalizeConfig } from "./util/config";
import { setNetwork, setNetworkFrom } from "./util/network";

import {
  createTruffleConfig,
  getTestFilePaths,
  save,
  setupTempFolders,
  tearDownTempFolders,
} from "./util/fileSystem";

import { getFunctionDescriptions } from "./graph/CFGUtils";

import Messages from "./ui/Messages";
import { SolidityCommandLineInterface } from "./ui/SolidityCommandLineInterface";
import { SolidityMonitorCommandLineInterface } from "./ui/SolidityMonitorCommandLineInterface";

import { ImportVisitor } from "./analysis/static/dependency/ImportVisitor";
import { LibraryVisitor } from "./analysis/static/dependency/LibraryVisitor";

import * as fs from "fs";

import { ConstantPool } from "./seeding/constant/ConstantPool";
import { ConstantVisitor } from "./seeding/constant/ConstantVisitor";
import { SolidityTestCase } from "./testcase/SolidityTestCase";
import { SolidityTreeCrossover } from "./search/operators/crossover/SolidityTreeCrossover";

import { Target } from "./analysis/static/Target";
import { TargetPool } from "./analysis/static/TargetPool";
import { SourceGenerator } from "./analysis/static/source/SourceGenerator";
import { ASTGenerator } from "./analysis/static/ast/ASTGenerator";
import { TargetMapGenerator } from "./analysis/static/map/TargetMapGenerator";

const pkg = require("../package.json");
const Web3 = require("web3");
const globalModules = require("global-modules");

/**
 * Tries to load truffle module library and reports source. User can force use of
 * a non-local version using cli flags (see option). It's necessary to maintain
 * a fail-safe lib because feature was only introduced in 5.0.30. Load order is:
 *
 * 1. local node_modules
 * 2. global node_modules
 * 3. fail-safe (truffle lib v 5.0.31 at ./plugin-assets/truffle.library)
 *
 * @param  {Object} truffleConfig config
 * @return {Module}
 */
function loadLibrary(config) {
  // Local
  try {
    if (config.useGlobalTruffle || config.usePluginTruffle) throw null;
    return require("truffle");
  } catch (err) {}

  // Global
  try {
    if (config.usePluginTruffle) throw null;

    const globalTruffle = path.join(globalModules, "truffle");
    return require(globalTruffle);
  } catch (err) {}
}

export class SolidityLauncher {
  private readonly _program = "syntest-solidity";

  /**
   * Truffle Plugin: `truffle run coverage [options]`
   * @param  {Object}   config   @truffle/config config
   * @return {Promise}
   */
  public async run(config: TruffleConfig) {
    await createTruffleConfig();

    let api, error, failures;

    const tempContractsDir = path.join(process.cwd(), ".syntest_coverage");
    const tempArtifactsDir = path.join(process.cwd(), ".syntest_artifacts");

    try {
      // Filesystem & Compiler Re-configuration
      config = normalizeConfig(config);

      await guessCWD(config.workingDir);

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

      config.testDir = path.join(process.cwd(), Properties.temp_test_directory);

      getUserInterface().report("clear", []);
      getUserInterface().report("asciiArt", ["Syntest"]);
      getUserInterface().report("version", [
        require("../package.json").version,
      ]);

      if (config.help) return getUserInterface().report("help", []); // Exit if --help

      const truffle = loadLibrary(config);
      api = new API(myConfig);

      setNetwork(config, api);

      // Server launch
      const client = api.client || truffle.ganache;
      const address = await api.ganache(client);

      const web3 = new Web3(address);
      const accounts = await web3.eth.getAccounts();
      const nodeInfo = await web3.eth.getNodeInfo();
      const ganacheVersion = nodeInfo.split("/")[1];

      setNetworkFrom(config, accounts);

      // Exit if --version
      if (config.version) {
        getUserInterface().report("versions", [
          truffle.version,
          ganacheVersion,
          pkg.version,
        ]); // Exit if --help

        // Finish
        await tearDownTempFolders(tempContractsDir, tempArtifactsDir);

        // Shut server down
        await api.finish();
        return;
      }

      getUserInterface().report("header", ["General info"]);

      getUserInterface().report("property-set", [
        "Network Info",
        [
          ["id", config.network],
          ["port", config.networks[config.network].network_id],
          ["network", config.networks[config.network].port],
        ],
      ]);

      getUserInterface().report("header", ["Targets"]);

      // Run post-launch server hook;
      await api.onServerReady(config);

      const obj = await loadTargetFiles();
      const included = obj["included"];
      const excluded = obj["excluded"];

      if (!included.length) {
        // Finish
        await tearDownTempFolders(tempContractsDir, tempArtifactsDir);

        // Shut server down
        await api.finish();
        getUserInterface().error(
          `No targets where selected! Try changing the 'include' parameter`
        );
        process.exit(1);
      }

      getUserInterface().report(
        "targets",
        included.map((t) => t.relativePath)
      );
      getUserInterface().report(
        "skip-files",
        excluded.map((s) => s.relativePath)
      );

      getUserInterface().report("header", ["configuration"]);

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

      // Instrument
      const targets = api.instrument(included);
      const skipped = excluded;

      await setupTempFolders(tempContractsDir, tempArtifactsDir);
      await save(targets, config.contracts_directory, tempContractsDir);
      await save(skipped, config.contracts_directory, tempContractsDir);

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

      const finalArchive = new Archive<SolidityTestCase>();
      let finalImportsMap: Map<string, string> = new Map();
      let finalDependencies: Map<string, string[]> = new Map();

      const sourceGenerator = new SourceGenerator();
      const astGenerator = new ASTGenerator();
      const targetMapGenerator = new TargetMapGenerator();
      const cfgGenerator = new SolidityCFGFactory();
      const targetPool = new TargetPool(
        sourceGenerator,
        astGenerator,
        targetMapGenerator,
        cfgGenerator
      );

      for (const target of targets) {
        const { importsMap, dependencyMap } = await testTarget(
          targetPool,
          target,
          api,
          truffle,
          config
        );

        finalImportsMap = new Map([
          ...Array.from(finalImportsMap.entries()),
          ...Array.from(importsMap.entries()),
        ]);
        finalDependencies = new Map([
          ...Array.from(finalDependencies.entries()),
          ...Array.from(dependencyMap.entries()),
        ]);
      }

      await createDirectoryStructure();
      await createTempDirectoryStructure();

      const stringifier = new SolidityTruffleStringifier(
        finalImportsMap,
        finalDependencies
      );

      const suiteBuilder = new SoliditySuiteBuilder(
        stringifier,
        api,
        truffle,
        config
      );

      await suiteBuilder.createSuite(finalArchive as Archive<SolidityTestCase>);

      await deleteTempDirectories();

      config.test_files = await getTestFilePaths({
        testDir: path.resolve(Properties.final_suite_directory),
      });

      // Run tests
      // by replacing the console.log global function we disable the output of the truffle test results
      const old = console.log;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      console.log = function () {};
      try {
        await truffle.test.run(config);
      } catch (e) {
        error = e.stack;
        getUserInterface().error(e);
        console.trace(e);
      }
      console.log = old;
      await api.onTestsComplete(config);

      getUserInterface().report("header", ["search results"]);

      // Run Istanbul
      await api.report();
      await api.onIstanbulComplete(config);
    } catch (e) {
      error = e;
      console.trace(e);
    }

    // Finish
    await tearDownTempFolders(tempContractsDir, tempArtifactsDir);

    // Shut server down
    await api.finish();

    //if (error !== undefined) throw error;
    //if (failures > 0) throw new Error(ui.generate("tests-fail", [failures]));
  }
}

async function testTarget(
  targetPool: TargetPool,
  target: any,
  api,
  truffle,
  config
) {
  console.log(target);
  await createDirectoryStructure();

  const [cfg, contracts] = targetPool.getCFG(target.canonicalPath);

  if (Properties.draw_cfg) {
    // TODO dot's in the the name of a file will give issues
    drawGraph(
      cfg,
      path.join(
        Properties.cfg_directory,
        `${target.relativePath.split(".")[0]}.svg`
      )
    );
  }

  const finalArchive = new Archive<SolidityTestCase>();

  for (const contractName of contracts) {
    const archive = await testContract(
      targetPool,
      target,
      contractName,
      api,
      truffle,
      config
    );

    finalArchive.merge(archive);
  }

  target.contracts = contracts;

  // TODO: check if we can prevent recalculating the dependencies
  const ast = SolidityParser.parse(target.actualSource, {
    loc: true,
    range: true,
  });

  return getImportDependencies(ast, target);
}

async function testContract(
  targetPool: TargetPool,
  target: any,
  contractName: string,
  api,
  truffle,
  config
) {
  try {
    await createDirectoryStructure();
    await createTempDirectoryStructure();

    getUserInterface().report("header", [
      `Searching: "${target.relativePath}"`,
    ]);

    const ast = targetPool.getAST(target.canonicalPath);
    const [cfg, contracts] = targetPool.getCFG(target.canonicalPath);

    const functionDescriptions = getFunctionDescriptions(cfg, contractName);

    const currentSubject = new SoliditySubject(
      target.relativePath,
      contractName,
      cfg,
      functionDescriptions
    );

    const { importsMap, dependencyMap } = getImportDependencies(ast, target);

    const stringifier = new SolidityTruffleStringifier(
      importsMap,
      dependencyMap
    );
    const suiteBuilder = new SoliditySuiteBuilder(
      stringifier,
      api,
      truffle,
      config
    );

    const runner = new SolidityRunner(suiteBuilder, api, truffle, config);

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
    collector.recordVariable(RuntimeVariable.VERSION, 1);
    collector.recordVariable(
      RuntimeVariable.CONFIGURATION,
      Properties.configuration
    );
    collector.recordVariable(RuntimeVariable.SEED, getSeed());
    collector.recordVariable(RuntimeVariable.SUBJECT, target.relativePath);
    collector.recordVariable(
      RuntimeVariable.PROBE_ENABLED,
      Properties.probe_objective
    );
    collector.recordVariable(
      RuntimeVariable.CONSTANT_POOL_ENABLED,
      Properties.constant_pool
    );
    collector.recordVariable(RuntimeVariable.ALGORITHM, Properties.algorithm);
    collector.recordVariable(
      RuntimeVariable.TOTAL_OBJECTIVES,
      currentSubject.getObjectives().length
    );

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
    collector.recordVariable(
      RuntimeVariable.COVERED_OBJECTIVES,
      archive.getObjectives().length
    );
    collector.recordVariable(
      RuntimeVariable.INITIALIZATION_TIME,
      totalTimeBudget.getUsedBudget() - searchBudget.getUsedBudget()
    );
    collector.recordVariable(
      RuntimeVariable.SEARCH_TIME,
      searchBudget.getUsedBudget()
    );
    collector.recordVariable(
      RuntimeVariable.TOTAL_TIME,
      totalTimeBudget.getUsedBudget()
    );
    collector.recordVariable(
      RuntimeVariable.ITERATIONS,
      iterationBudget.getUsedBudget()
    );
    collector.recordVariable(
      RuntimeVariable.EVALUATIONS,
      evaluationBudget.getUsedBudget()
    );

    collectCoverageData(collector, archive, "branch");
    collectCoverageData(collector, archive, "statement");
    collectCoverageData(collector, archive, "function");
    collectCoverageData(collector, archive, "probe");

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

function getImportDependencies(ast: any, target: any) {
  const contractName = target.instrumented.contractName;

  // Import the contract under test
  const importsMap = new Map<string, string>();
  importsMap.set(contractName, contractName);

  // Find all external imports in the contract under test
  const importVisitor = new ImportVisitor();
  SolidityParser.visit(ast, importVisitor);

  // For each external import scan the file for libraries with public and external functions
  const libraries: string[] = [];
  importVisitor.getImports().forEach((importPath: string) => {
    // Full path to the imported file
    const pathLib = path.join(path.dirname(target.canonicalPath), importPath);

    // Read the imported file
    // TODO: use the already parsed excluded information to prevent duplicate file reading
    const source = fs.readFileSync(pathLib).toString();

    // Parse the imported file
    const astLib = SolidityParser.parse(source, {
      loc: true,
      range: true,
    });

    // Scan for libraries with public or external functions
    const libraryVisitor = new LibraryVisitor();
    SolidityParser.visit(astLib, libraryVisitor);

    // Import the external file in the test
    importsMap.set(
      path.basename(importPath).split(".")[0],
      path.basename(importPath).split(".")[0]
    );

    // Import the found libraries
    // TODO: check for duplicates in libraries
    libraries.push(...libraryVisitor.libraries);
  });

  // Return the library dependency information
  const dependencyMap = new Map<string, string[]>();
  dependencyMap.set(contractName, libraries);
  return { importsMap, dependencyMap };
}

function collectCoverageData(
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
        collector.recordVariable(RuntimeVariable.COVERED_PROBES, covered.size);
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
