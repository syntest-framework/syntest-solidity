import {
  ExecutionResult,
  getLogger,
  Properties,
  SuiteBuilder,
  TestCaseRunner,
  getUserInterface,
} from "syntest-framework";
import * as path from "path";
import {
  SolidityExecutionResult,
  SolidityExecutionStatus,
} from "../../search/SolidityExecutionResult";
import { Runner } from "mocha";
import { SoliditySubject } from "../../search/SoliditySubject";
import { getTestFilePaths } from "../../util/fileSystem";
import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";

// import * as Mocha from 'mocha';
import Suite from "mocha/lib/suite.js";
import { mRequire } from "../../memfs";

export class SolidityRunner extends TestCaseRunner {
  protected api: any;
  protected truffle: any;
  protected config: any;

  constructor(suiteBuilder: SuiteBuilder, api: any, truffle: any, config: any) {
    super(suiteBuilder);
    this.api = api;
    this.truffle = truffle;

    this.truffle.test.createMocha = function (config) {
      console.log("custom create mocha");

      // Allow people to specify config.mocha in their config.
      const mochaConfig = config.mocha || {};

      // Propagate --bail option to mocha
      mochaConfig.bail = config.bail;

      // If the command line overrides color usage, use that.
      if (config.color != null) {
        mochaConfig.color = config.color;
      } else if (config.colors != null) {
        // --colors is a mocha alias for --color
        mochaConfig.color = config.colors;
      }

      // Default to true if configuration isn't set anywhere.
      if (mochaConfig.color == null) {
        mochaConfig.color = true;
      }

      let Mocha = mochaConfig.package || require("mocha");
      delete mochaConfig.package;
      const mocha = new Mocha(mochaConfig);

      // @ts-ignore
      console.log(mocha);
      mocha.loadFiles = function (callback) {
        const {
          suite,
            files
        } = this as Mocha

        for (let file of files) {
          file = path.resolve(file);

          suite.emit(
              Suite.constants.EVENT_FILE_PRE_REQUIRE,
              global,
              file,
              this,
          );
          suite.emit(
              Suite.constants.EVENT_FILE_REQUIRE,
              mRequire(file),
              file,
              this,
          );
          suite.emit(
              Suite.constants.EVENT_FILE_POST_REQUIRE,
              global,
              file,
              this,
          );
        }
        if (typeof callback === 'function') {
          callback();
        }
      };

      return mocha;
    };

    this.config = config;
  }

  async execute(
      subject: SoliditySubject<SolidityTestCase>,
      testCase: SolidityTestCase
  ): Promise<ExecutionResult> {
    const testPath = path.join(Properties.temp_test_directory, "tempTest.js");
    await this.suiteBuilder.writeTestCase(
        testPath,
        testCase,
        (testCase.root as ConstructorCall).constructorName
    );

    this.config.test_files = await getTestFilePaths(this.config);

    // Reset instrumentation data (no hits)
    this.api.resetInstrumentationData();

    // By replacing the global log function we disable the output of the truffle test framework
    const old = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = () => {};

    const time = Date.now()
    // Run tests
    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
      getUserInterface().error(e);
      console.trace(e);
    }
    console.log = old;
    // console.log(`#TIMING: ${Date.now() - time} ms`)
    // Retrieve execution information from the Mocha runner
    const mochaRunner: Runner = this.truffle.test.mochaRunner;
    const stats = mochaRunner.stats;

    // If one of the executions failed, log it
    if (stats.failures > 0) {
      getUserInterface().error("Test case has failed!");
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
