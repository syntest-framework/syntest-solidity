import {
  ExecutionResult,
  getLogger,
  getProperty,
  SuiteBuilder,
  TestCase,
  TestCaseRunner,
} from "syntest-framework";
import * as path from "path";
import { SolidityExecutionResult } from "../../search/SolidityExecutionResult";

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

  async execute(testCase: TestCase): Promise<ExecutionResult> {
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

    let failures;
    // Run tests

    try {
      failures = await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
    }

    let exception;
    if (failures) {
      // TODO maybe not stop? could be a bug that has been found
      exception = this.truffle.test.mochaRunner.suite.suites[0].tests[0].err
        .stack;
      getLogger().error("Test case has failed!");
      //process.exit(1)
    }

    const datapoints = this.api.getInstrumentationData();

    this.api.resetInstrumentationData();
    // Remove test file
    await this.suiteBuilder.deleteTestCase(this.config.test_files[0]);

    const finalpoints = [];

    for (const key of Object.keys(datapoints)) {
      finalpoints.push(datapoints[key]);
    }

    return new SolidityExecutionResult(finalpoints);
  }
}
