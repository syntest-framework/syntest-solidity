import {
  Datapoint,
  getLogger,
  getProperty,
  TestCaseRunner,
  SuiteBuilder,
  TestCase,
} from "syntest-framework";
import * as path from "path";

const truffleUtils = require("../../../plugins/resources/truffle.utils");

export class SolidityRunner extends TestCaseRunner {
  private api: any;
  private truffle: any;
  private config: any;

  constructor(suiteBuilder: SuiteBuilder, api: any, truffle: any, config: any) {
    super(suiteBuilder);
    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  async runTestCase(testCase: TestCase): Promise<Datapoint[]> {
    // TODO very stupid but we have to create actual files for truffle to run...

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

    if (failures) {
      // TODO maybe not stop? could be a bug that has been found
      getLogger().error("Test case has failed!");
      //process.exit(1)
    }

    const datapoints = this.api.getInstrumentationData();

    this.api.resetInstrumentationData();
    // Remove test file
    await this.suiteBuilder.deleteTestCase(testPath);

    const finalpoints = [];

    for (const key of Object.keys(datapoints)) {
      finalpoints.push(datapoints[key]);
    }

    return finalpoints;
  }
}
