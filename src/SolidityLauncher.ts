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
  TargetFile,
} from "syntest-framework";

import * as path from "path";
import TruffleConfig = require("@truffle/config");

import API = require("../src/api");

import { normalizeConfig } from "./util/config";
import { setNetwork, setNetworkFrom } from "./util/network";

import {
  getTestFilePaths,
  save,
  setupTempFolders,
  tearDownTempFolders,
} from "./util/fileSystem";
import CLI from "./ui/CLI";
import { readFileSync } from "fs";
import { ImportVisitor } from "./graph/ImportVisitor";
import { LibraryVisitor } from "./graph/LibraryVisitor";

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

    const lib = require("truffle");
    getLogger().info("lib-local");
    return lib;
  } catch (err) {}

  // Global
  try {
    if (config.usePluginTruffle) throw null;

    const globalTruffle = path.join(globalModules, "truffle");
    const lib = require(globalTruffle);
    getLogger().info("lib-global");
    return lib;
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
    let api, error, failures;

    // Filesystem & Compiler Re-configuration
    config = normalizeConfig(config);

    // const tempContractsDir = path.join(config.workingDir, '.coverage_contracts')
    // const tempArtifactsDir = path.join(config.workingDir, '.coverage_artifacts')
    const tempContractsDir = path.join(process.cwd(), ".syntest_coverage");
    const tempArtifactsDir = path.join(process.cwd(), ".syntest_artifacts");

    try {
      const ui = new CLI(true);

      // TODO: why again
      config = normalizeConfig(config);

      await guessCWD(config.workingDir);

      const additionalOptions = {}; // TODO
      setupOptions(this._program, additionalOptions);

      const args = process.argv.slice(process.argv.indexOf(this._program) + 1);
      const myConfig = loadConfig(args);

      processConfig(myConfig, args);
      setupLogger();

      config.testDir = path.join(process.cwd(), Properties.temp_test_directory);

      if (config.help) return ui.report("help"); // Exit if --help

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

      // Version Info
      ui.report("versions", [truffle.version, ganacheVersion, pkg.version]);

      // Exit if --version
      if (config.version) {
        // Finish
        await tearDownTempFolders(tempContractsDir, tempArtifactsDir);

        // Shut server down
        await api.finish();
        getLogger().info(`Version: `);
        process.exit(0);
      }

      ui.report("network", [
        config.network,
        config.networks[config.network].network_id,
        config.networks[config.network].port,
      ]);

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
        getLogger().error(
          `No targets where selected! Try changing the 'include' parameter`
        );
        process.exit(1);
      }

      // Instrument
      const targets = api.instrument(included);
      const skipped = excluded;

      ui.reportSkipped(config, skipped);

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

      const finalArchive = new Archive<TestCase>();
      let finalImportsMap: Map<string, string> = new Map();
      let finalDependencies: Map<string, string[]> = new Map();

      for (const target of targets) {
        const archive = await testTarget(
          target,
          excluded,
          api,
          truffle,
          config
        );

        for (const key of archive.getObjectives()) {
          finalArchive.update(key, archive.getEncoding(key));
        }

        // TODO: check if we can prevent recalculating the dependencies
        const ast = SolidityParser.parse(target.actualSource, {
          loc: true,
          range: true,
        });
        const { importsMap, dependencyMap } = getImportDependencies(ast, target);
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

      await suiteBuilder.createSuite(finalArchive as Archive<TestCase>);

      await deleteTempDirectories();

      config.test_files = await getTestFilePaths({
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
  target: any,
  excluded: TargetFile[],
  api,
  truffle,
  config
) {
  try {
    await createDirectoryStructure();
    await createTempDirectoryStructure();

    getLogger().info(`Testing target: ${target.relativePath}`);

    const ast = SolidityParser.parse(target.actualSource, {
      loc: true,
      range: true,
    });

    const contractName = target.instrumented.contractName;
    const cfgFactory = new SolidityCFGFactory();
    const cfg = cfgFactory.convertAST(ast, false, false);
    const fnMap = target.instrumented.fnMap;

    drawGraph(cfg, path.join(Properties.cfg_directory, `${contractName}.svg`));

    const currentSubject = new SoliditySubject(contractName, cfg, fnMap);

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

    const sampler = new SolidityRandomSampler(currentSubject);
    const algorithm = createAlgorithmFromConfig(sampler, runner);

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
    collector.recordVariable(RuntimeVariable.ALGORITHM, Properties.algorithm);
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

    collectCoverageData(collector, archive, "branch");
    collectCoverageData(collector, archive, "statement");
    collectCoverageData(collector, archive, "function");
    collectCoverageData(collector, archive, "probe");

    const numOfExceptions = archive
      .getObjectives()
      .filter((objective) => objective instanceof ExceptionObjectiveFunction)
      .length;
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
  importVisitor.imports.forEach((importPath: string) => {
    // Full path to the imported file
    const pathLib = path.join(path.dirname(target.canonicalPath), importPath);

    // Read the imported file
    // TODO: use the already parsed excluded information to prevent duplicate file reading
    const source = readFileSync(pathLib).toString();

    // Parse the imported file
    const astLib = SolidityParser.parse(source, {
      loc: true,
      range: true
    });

    // Scan for libraries with public or external functions
    const libraryVisitor = new LibraryVisitor();
    SolidityParser.visit(astLib, libraryVisitor);

    // Import the external file in the test
    importsMap.set(path.basename(importPath).split(".")[0], path.basename(importPath).split(".")[0]);

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
