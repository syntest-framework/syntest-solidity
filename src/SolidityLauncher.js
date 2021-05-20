"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityLauncher = void 0;
const SoliditySubject_1 = require("./search/SoliditySubject");
const SolidityTruffleStringifier_1 = require("./testbuilding/SolidityTruffleStringifier");
const SoliditySuiteBuilder_1 = require("./testbuilding/SoliditySuiteBuilder");
const SolidityRunner_1 = require("./testcase/execution/SolidityRunner");
const SolidityRandomSampler_1 = require("./testcase/sampling/SolidityRandomSampler");
const syntest_framework_1 = require("syntest-framework");
const path = require("path");
const API = require("../src/api");
const deployment_1 = require("./util/deployment");
const config_1 = require("./util/config");
const network_1 = require("./util/network");
const fileSystem_1 = require("./util/fileSystem");
const CLI_1 = require("./ui/CLI");
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
        if (config.useGlobalTruffle || config.usePluginTruffle)
            throw null;
        const lib = require("truffle");
        syntest_framework_1.getLogger().info("lib-local");
        return lib;
    }
    catch (err) { }
    // Global
    try {
        if (config.usePluginTruffle)
            throw null;
        const globalTruffle = path.join(globalModules, "truffle");
        const lib = require(globalTruffle);
        syntest_framework_1.getLogger().info("lib-global");
        return lib;
    }
    catch (err) { }
}
class SolidityLauncher {
    constructor() {
        this._program = "syntest-solidity";
    }
    /**
     * Truffle Plugin: `truffle run coverage [options]`
     * @param  {Object}   config   @truffle/config config
     * @return {Promise}
     */
    run(config) {
        return __awaiter(this, void 0, void 0, function* () {
            let api, error, failures;
            // Filesystem & Compiler Re-configuration
            const tempContractsDir = path.join('.syntest_coverage');
            const tempArtifactsDir = path.join('.syntest_artifacts');
            try {
                const ui = new CLI_1.default(true);
                config = config_1.normalizeConfig(config);
                yield syntest_framework_1.guessCWD(null);
                const additionalOptions = {}; // TODO
                syntest_framework_1.setupOptions(this._program, additionalOptions);
                const args = process.argv.slice(process.argv.indexOf(this._program) + 1);
                const myConfig = syntest_framework_1.loadConfig(args);
                syntest_framework_1.processConfig(myConfig, args);
                syntest_framework_1.setupLogger();
                config.testDir = syntest_framework_1.Properties.temp_test_directory;
                if (config.help)
                    return ui.report("help"); // Exit if --help
                const truffle = loadLibrary(config);
                api = new API(myConfig);
                network_1.setNetwork(config, api);
                // Server launch
                const client = api.client || truffle.ganache;
                const address = yield api.ganache(client);
                const web3 = new Web3(address);
                const accounts = yield web3.eth.getAccounts();
                const nodeInfo = yield web3.eth.getNodeInfo();
                const ganacheVersion = nodeInfo.split("/")[1];
                network_1.setNetworkFrom(config, accounts);
                // Version Info
                ui.report("versions", [truffle.version, ganacheVersion, pkg.version]);
                // Exit if --version
                if (config.version) {
                    // Finish
                    yield fileSystem_1.tearDownTempFolders(tempContractsDir, tempArtifactsDir);
                    // Shut server down
                    yield api.finish();
                }
                ui.report("network", [
                    config.network,
                    config.networks[config.network].network_id,
                    config.networks[config.network].port,
                ]);
                // Run post-launch server hook;
                yield api.onServerReady(config);
                const obj = yield syntest_framework_1.loadTargetFiles();
                const included = obj['included'];
                const excluded = obj['excluded'];
                if (!included.length) {
                    syntest_framework_1.getLogger().error(`No targets where selected! Try changing the 'include' parameter`);
                    process.exit(1);
                }
                // Instrument
                const targets = api.instrument(included);
                const skipped = excluded;
                ui.reportSkipped(config, skipped);
                yield fileSystem_1.setupTempFolders(tempContractsDir, tempArtifactsDir);
                fileSystem_1.save(targets, config.contracts_directory, tempContractsDir);
                fileSystem_1.save(skipped, config.contracts_directory, tempContractsDir);
                config.contracts_directory = tempContractsDir;
                config.build_directory = tempArtifactsDir;
                config.contracts_build_directory = path.join(tempArtifactsDir, path.basename(config.contracts_build_directory));
                config.all = true;
                config.compilers.solc.settings.optimizer.enabled = false;
                config.quiet = true;
                // Compile Instrumented Contracts
                yield truffle.contracts.compile(config);
                yield api.onCompileComplete(config);
                const finalArchive = new syntest_framework_1.Archive();
                for (const target of targets) {
                    const archive = yield testTarget(target, excluded, api, truffle, config);
                    for (const key of archive.getObjectives()) {
                        finalArchive.update(key, archive.getEncoding(key));
                    }
                }
                yield deployment_1.createMigrationsDir();
                yield deployment_1.generateInitialMigration();
                yield deployment_1.generateDeployContracts(targets, excluded.map((e) => path.basename(e.relativePath).split('.')[0]));
                yield syntest_framework_1.createDirectoryStructure();
                yield syntest_framework_1.createTempDirectoryStructure();
                const stringifier = new SolidityTruffleStringifier_1.SolidityTruffleStringifier();
                const suiteBuilder = new SoliditySuiteBuilder_1.SoliditySuiteBuilder(stringifier, api, truffle, config);
                yield suiteBuilder.createSuite(finalArchive);
                yield syntest_framework_1.deleteTempDirectories();
                yield deployment_1.removeMigrationsDir();
                config.test_files = yield fileSystem_1.getTestFilePaths({
                    testDir: path.resolve(syntest_framework_1.Properties.final_suite_directory),
                });
                // Run tests
                try {
                    failures = yield truffle.test.run(config);
                }
                catch (e) {
                    error = e.stack;
                }
                yield api.onTestsComplete(config);
                // Run Istanbul
                yield api.report();
                yield api.onIstanbulComplete(config);
            }
            catch (e) {
                error = e;
                console.trace(e);
            }
            // Finish
            yield fileSystem_1.tearDownTempFolders(tempContractsDir, tempArtifactsDir);
            // Shut server down
            yield api.finish();
            //if (error !== undefined) throw error;
            //if (failures > 0) throw new Error(ui.generate("tests-fail", [failures]));
        });
    }
}
exports.SolidityLauncher = SolidityLauncher;
function testTarget(target, excluded, api, truffle, config) {
    return __awaiter(this, void 0, void 0, function* () {
        yield deployment_1.createMigrationsDir();
        yield deployment_1.generateInitialMigration();
        yield deployment_1.generateDeployContracts([target], excluded.map((e) => path.basename(e.relativePath).split('.')[0]));
        yield syntest_framework_1.createDirectoryStructure();
        yield syntest_framework_1.createTempDirectoryStructure();
        syntest_framework_1.getLogger().info(`Testing target: ${target.relativePath}`);
        const contractName = target.instrumented.contractName;
        const cfg = target.instrumented.cfg;
        const fnMap = target.instrumented.fnMap;
        syntest_framework_1.drawGraph(cfg, path.join(syntest_framework_1.Properties.cfg_directory, `${contractName}.svg`));
        const currentSubject = new SoliditySubject_1.SoliditySubject(contractName, cfg, fnMap);
        const stringifier = new SolidityTruffleStringifier_1.SolidityTruffleStringifier();
        const suiteBuilder = new SoliditySuiteBuilder_1.SoliditySuiteBuilder(stringifier, api, truffle, config);
        const runner = new SolidityRunner_1.SolidityRunner(suiteBuilder, api, truffle, config);
        const sampler = new SolidityRandomSampler_1.SolidityRandomSampler(currentSubject);
        const algorithm = syntest_framework_1.createAlgorithmFromConfig(sampler, runner);
        yield suiteBuilder.clearDirectory(syntest_framework_1.Properties.temp_test_directory);
        // allocate budget manager
        const iterationBudget = new syntest_framework_1.IterationBudget(syntest_framework_1.Properties.iteration_budget);
        const evaluationBudget = new syntest_framework_1.EvaluationBudget();
        const searchBudget = new syntest_framework_1.SearchTimeBudget(syntest_framework_1.Properties.search_time);
        const totalTimeBudget = new syntest_framework_1.TotalTimeBudget(syntest_framework_1.Properties.total_time);
        const budgetManager = new syntest_framework_1.BudgetManager();
        budgetManager.addBudget(iterationBudget);
        budgetManager.addBudget(evaluationBudget);
        budgetManager.addBudget(searchBudget);
        budgetManager.addBudget(totalTimeBudget);
        // This searches for a covering population
        const archive = yield algorithm.search(currentSubject, budgetManager);
        const collector = new syntest_framework_1.StatisticsCollector(totalTimeBudget);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.VERSION, 1);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.CONFIGURATION, syntest_framework_1.Properties.configuration);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.SUBJECT, target.relativePath);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.PROBE_ENABLED, syntest_framework_1.Properties.probe_objective);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.ALGORITHM, syntest_framework_1.Properties.algorithm);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.TOTAL_OBJECTIVES, currentSubject.getObjectives().length);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERED_OBJECTIVES, archive.getObjectives().length);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.SEED, syntest_framework_1.Properties.seed);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.SEARCH_TIME, searchBudget.getCurrentBudget());
        collector.recordVariable(syntest_framework_1.RuntimeVariable.TOTAL_TIME, totalTimeBudget.getCurrentBudget());
        collector.recordVariable(syntest_framework_1.RuntimeVariable.ITERATIONS, iterationBudget.getCurrentBudget());
        collector.recordVariable(syntest_framework_1.RuntimeVariable.EVALUATIONS, evaluationBudget.getCurrentBudget());
        collectCoverageData(collector, archive, "branch");
        collectCoverageData(collector, archive, "statement");
        collectCoverageData(collector, archive, "function");
        collectCoverageData(collector, archive, "probe");
        const numOfExceptions = archive
            .getObjectives()
            .filter((objective) => objective instanceof syntest_framework_1.ExceptionObjectiveFunction).length;
        collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERED_EXCEPTIONS, numOfExceptions);
        collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERAGE, (archive.getObjectives().length - numOfExceptions) /
            currentSubject.getObjectives().length);
        const statisticFile = path.resolve(syntest_framework_1.Properties.statistics_directory);
        const writer = new syntest_framework_1.SummaryWriter();
        writer.write(collector, statisticFile + "/statistics.csv");
        yield syntest_framework_1.deleteTempDirectories();
        yield deployment_1.removeMigrationsDir();
        return archive;
    });
}
function collectCoverageData(collector, archive, objectiveType) {
    const total = new Set();
    const covered = new Set();
    for (const key of archive.getObjectives()) {
        const test = archive.getEncoding(key);
        const result = test.getExecutionResult();
        const contractName = key.getSubject().name.concat(".sol");
        result
            .getTraces()
            .filter((element) => element.type.includes(objectiveType))
            .filter((element) => {
            const paths = element.contractPath.split("/");
            return paths[paths.length - 1].includes(contractName);
        })
            .forEach((current) => {
            total.add(current.type + "_" + current.line + "_" + current.locationIdx);
            if (current.hits > 0)
                covered.add(current.type + "_" + current.line + "_" + current.locationIdx);
        });
    }
    switch (objectiveType) {
        case "branch":
            {
                collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERED_BRANCHES, covered.size);
                collector.recordVariable(syntest_framework_1.RuntimeVariable.TOTAL_BRANCHES, total.size);
                if (total.size > 0.0) {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.BRANCH_COVERAGE, covered.size / total.size);
                }
                else {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.BRANCH_COVERAGE, 0);
                }
            }
            break;
        case "statement":
            {
                collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERED_LINES, covered.size);
                collector.recordVariable(syntest_framework_1.RuntimeVariable.TOTAL_LINES, total.size);
                if (total.size > 0.0) {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.LINE_COVERAGE, covered.size / total.size);
                }
                else {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.LINE_COVERAGE, 0);
                }
            }
            break;
        case "function":
            {
                collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERED_FUNCTIONS, covered.size);
                collector.recordVariable(syntest_framework_1.RuntimeVariable.TOTAL_FUNCTIONS, total.size);
                if (total.size > 0.0) {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.FUNCTION_COVERAGE, covered.size / total.size);
                }
                else {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.FUNCTION_COVERAGE, 0);
                }
            }
            break;
        case "probe":
            {
                collector.recordVariable(syntest_framework_1.RuntimeVariable.COVERED_PROBES, covered.size);
                collector.recordVariable(syntest_framework_1.RuntimeVariable.TOTAL_PROBES, total.size);
                if (total.size > 0.0) {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.PROBE_COVERAGE, covered.size / total.size);
                }
                else {
                    collector.recordVariable(syntest_framework_1.RuntimeVariable.PROBE_COVERAGE, 0);
                }
            }
            break;
    }
}
//# sourceMappingURL=SolidityLauncher.js.map