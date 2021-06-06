import {
  ExecutionResult,
  getLogger,
  getProperty,
  SuiteBuilder,
  TestCase,
  TestCaseRunner,
} from "@syntest-framework/syntest-framework";
import * as path from "path";
import {
  SolidityExecutionResult,
  SolidityExecutionStatus,
} from "../../search/SolidityExecutionResult";
import { Runner } from "mocha";
import { SoliditySubject } from "../../search/SoliditySubject";

const truffleUtils = require("../../../plugins/resources/truffle.utils");

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
    const testPath = path.join(
      getProperty("temp_test_directory"),
      "tempTest.js"
    );
    await this.suiteBuilder.writeTestCase(
      testPath,
      testCase,
      testCase.root.constructorName
    );

    this.config.testDir = path.resolve(getProperty("temp_test_directory"));
    this.config.test_files = await truffleUtils.getTestFilePaths(this.config);

    // Reset instrumentation data (no hits)
    this.api.resetInstrumentationData();

    // Run tests
    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
      getLogger().error(e);
    }

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
