import {
  ExecutionResult,
  getLogger,
  Properties,
  SuiteBuilder,
  TestCase,
  TestCaseRunner,
} from "syntest-framework";
import * as path from "path";
import {
  SolidityExecutionResult,
  SolidityExecutionStatus,
} from "../../search/SolidityExecutionResult";
import { Runner } from "mocha";
import { SoliditySubject } from "../../search/SoliditySubject";
import { getTestFilePaths } from "../../util/fileSystem";

const colors = require("colors");
const chai = require("chai");
const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const Config = require("@truffle/config");
const WorkflowCompile = require("@truffle/workflow-compile");
const Resolver = require("@truffle/resolver");
const TestRunner = require("./TestRunner");
const SolidityTest = require("./SolidityTest");
const RangeUtils = require("@truffle/compile-solidity/compilerSupplier/rangeUtils");
const expect = require("@truffle/expect");
const Migrate = require("@truffle/migrate");
const Profiler = require("@truffle/compile-solidity/profiler");
const originalrequire = require("original-require");
const Codec = require("@truffle/codec");
const debug = require("debug")("lib:test");
const Debugger = require("@truffle/debugger");

import * as Mocha from 'mocha';
import Suite from 'mocha/lib/suite.js';
import { mRequire } from '../../memfs';

async function truffleRun (options) {
  expect.options(options, [
    "contracts_directory",
    "contracts_build_directory",
    "migrations_directory",
    "test_files",
    "network",
    "network_id",
    "provider"
  ]);

  // @ts-ignore
  Mocha.prototype.loadFiles = function(fn) {
    var self = this;
    var suite = this.suite;
    this.files.forEach(function(file) {
      file = path.resolve(file);
      suite.emit(Suite.constants.EVENT_FILE_PRE_REQUIRE, global, file, self);
      suite.emit(Suite.constants.EVENT_FILE_REQUIRE, mRequire(file), file, self);
      // suite.emit(Suite.constants.EVENT_FILE_REQUIRE, require(file), file, self);
      suite.emit(Suite.constants.EVENT_FILE_POST_REQUIRE, global, file, self);
    });
    fn && fn();
  };

  const config = Config.default().merge(options);

  config.test_files = config.test_files.map(testFile => {
    return path.resolve(testFile);
  });

  const interfaceAdapter = createInterfaceAdapter({
    provider: config.provider,
    networkType: config.networks[config.network].type
  });

  // `accounts` will be populated before each contract() invocation
  // and passed to it so tests don't have to call it themselves.
  const web3 = new Web3Shim({
    provider: config.provider,
    networkType: config.networks[config.network].type
        ? config.networks[config.network].type
        : "web3js"
  });

  // Override console.warn() because web3 outputs gross errors to it.
  // e.g., https://github.com/ethereum/web3.js/blob/master/lib/web3/allevents.js#L61
  // Output looks like this during tests: https://gist.github.com/tcoulter/1988349d1ec65ce6b958
  const warn = config.logger.warn;
  config.logger.warn = function (message) {
    if (message === "cannot find event for log") {
      return;
    } else {
      if (warn) warn.apply(console, arguments);
    }
  };

  const mocha = this.createMocha(config);

  const jsTests = config.test_files.filter(file => {
    return path.extname(file) !== ".sol";
  });

  const solTests = config.test_files.filter(file => {
    return path.extname(file) === ".sol";
  });

  // Add Javascript tests because there's nothing we need to do with them.
  // Solidity tests will be handled later.
  jsTests.forEach(file => {
    // There's an idiosyncracy in Mocha where the same file can't be run twice
    // unless we delete the `require` cache.
    // https://github.com/mochajs/mocha/issues/995
    delete originalrequire.cache[file];

    mocha.addFile(file);
  });

  const accounts = await this.getAccounts(interfaceAdapter);

  const testResolver = new Resolver(config, {
    includeTruffleSources: true
  });

  const { compilations } = await this.compileContractsWithTestFilesIfNeeded(
      solTests,
      config,
      testResolver
  );

  const testContracts = solTests.map(testFilePath => {
    return testResolver.require(testFilePath);
  });

  const runner = new TestRunner(config);

  await this.performInitialDeploy(config, testResolver);

  const sourcePaths = []
      .concat(
          ...compilations.map(compilation => compilation.sourceIndexes) //we don't need the indices here, just the paths
      )
      .filter(path => path); //make sure we don't pass in any undefined

  await this.defineSolidityTests(mocha, testContracts, sourcePaths, runner);

  const debuggerCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations
  );

  //for stack traces, we'll need to set up a light-mode debugger...
  let bugger;
  if (config.stacktrace) {
    debug("stacktraces on!");
    bugger = await Debugger.forProject({
      compilations: debuggerCompilations,
      provider: config.provider,
      lightMode: true
    });
  }

  await this.setJSTestGlobals({
    config,
    web3,
    interfaceAdapter,
    accounts,
    testResolver,
    runner,
    compilations: debuggerCompilations,
    bugger
  });

  // Finally, run mocha.
  process.on("unhandledRejection", reason => {
    throw reason;
  });

  return new Promise(resolve => {
    this.mochaRunner = mocha.run(failures => {
      config.logger.warn = warn;
      resolve(failures);
    });
  });
}


export class SolidityRunner extends TestCaseRunner {
  protected api: any;
  protected truffle: any;
  protected config: any;

  constructor(suiteBuilder: SuiteBuilder, api: any, truffle: any, config: any) {
    super(suiteBuilder);
    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  async execute(
    subject: SoliditySubject<TestCase>,
    testCase: TestCase
  ): Promise<ExecutionResult> {
    const testPath = path.join(Properties.temp_test_directory, "tempTest.js");
    await this.suiteBuilder.writeTestCase(
      testPath,
      testCase,
      testCase.root.constructorName
    );

    // config.testDir = path.join(process.cwd(), Properties.temp_test_directory)

    // this.config.testDir = path.join(process.cwd(), Properties.temp_test_directory);
    this.config.test_files = await getTestFilePaths(this.config);

    // Reset instrumentation data (no hits)
    this.api.resetInstrumentationData();

    // console.log(this.config)
    // if (this.config) {
    //   process.exit(0)
    // }
    // Run tests
    const old = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = function () {};
    try {
      await truffleRun(this.config);
    } catch (e) {
      // TODO
      getLogger().error(e);
      console.trace(e);
    }
    console.log = old;
    // Retrieve execution information from the Mocha runner
    const mochaRunner: Runner = this.truffle.test.mochaRunner;
    const stats = mochaRunner.stats;

    // If one of the executions failed, log it
    if (stats.failures > 0) {
      getLogger().error("Test case has failed!");
    }

    // Retrieve execution traces
    const instrumentationData = this.api.getInstrumentationData();

    const traces = [];
    for (const key of Object.keys(instrumentationData)) {
      if (instrumentationData[key].contractPath.includes(subject.name + ".sol"))
        traces.push(instrumentationData[key]);
    }

    // Retrieve execution information
    let executionResult: SolidityExecutionResult;
    if (
      mochaRunner.suite.suites.length > 0 &&
      mochaRunner.suite.suites[0].tests.length > 0
    ) {
      const test = mochaRunner.suite.suites[0].tests[0];

      let status: SolidityExecutionStatus;
      let exception: string = null;
      if (test.isPassed()) {
        status = SolidityExecutionStatus.PASSED;
      } else if (test.timedOut) {
        status = SolidityExecutionStatus.TIMED_OUT;
      } else {
        status = SolidityExecutionStatus.FAILED;
        exception = test.err.message;
      }

      const duration = test.duration;

      executionResult = new SolidityExecutionResult(
        status,
        traces,
        duration,
        exception
      );
    } else {
      executionResult = new SolidityExecutionResult(
        SolidityExecutionStatus.FAILED,
        traces,
        stats.duration
      );
    }

    // Reset instrumentation data (no hits)
    this.api.resetInstrumentationData();

    // Remove test file
    await this.suiteBuilder.deleteTestCase(this.config.test_files[0]);

    return executionResult;
  }
}
