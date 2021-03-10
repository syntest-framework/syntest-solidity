import {
  getProperty,
  Objective,
  Stringifier,
  SuiteBuilder,
  TestCase,
} from "syntest-framework";
import { readdirSync, readFileSync, rmdirSync, writeFileSync } from "fs";
import * as path from "path";

const truffleUtils = require("../../plugins/resources/truffle.utils");

/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder extends SuiteBuilder {
  private api: any;
  private truffle: any;
  private config: any;

  constructor(stringifier: Stringifier, api: any, truffle: any, config: any) {
    super(stringifier);
    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  async writeTest(
    filePath: string,
    testCase: TestCase,
    targetName: string,
    addLogs = false,
    additionalAssertions?: Map<TestCase, { [p: string]: string }>
  ) {
    const stringifiedTestCase = this.stringifier.stringifyIndividual(
      testCase,
      targetName,
      addLogs,
      additionalAssertions
    );
    await writeFileSync(filePath, stringifiedTestCase);
  }

  async createSuite(archive: Map<Objective, TestCase>) {
    const reducedArchive = new Map<string, TestCase[]>();

    for (const key of archive.keys()) {
      const targetName = key.target.split("/").pop()!.split(".")[0]!;

      if (!reducedArchive.has(targetName)) {
        reducedArchive.set(targetName, []);
      }

      if (
        reducedArchive.get(targetName)!.includes(<TestCase>archive.get(key))
      ) {
        // skip duplicate individuals (i.e. individuals which cover multiple objectives
        continue;
      }

      reducedArchive.get(targetName)!.push(<TestCase>archive.get(key));
    }

    for (const key of reducedArchive.keys()) {
      for (const testCase of reducedArchive.get(key)!) {
        const testPath = path.join(
          getProperty("temp_test_directory"),
          `test${key}${testCase.id}.js`
        );
        await this.writeTest(testPath, testCase, "", true);
      }
    }

    this.config.test_files = await truffleUtils.getTestFilePaths(this.config);
    // Run tests
    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
    }

    // Create final tests files with additional assertions
    await this.clearDirectory(getProperty("temp_test_directory"));

    for (const key of reducedArchive.keys()) {
      const assertions = new Map();

      for (const testCase of reducedArchive.get(key)!) {
        const additionalAssertions: { [key: string]: string } = {};
        // extract the log statements
        const dir = await readdirSync(
          path.join(getProperty("temp_log_directory"), testCase.id)
        );

        for (const file of dir) {
          additionalAssertions[file] = await readFileSync(
            path.join(getProperty("temp_log_directory"), testCase.id, file),
            "utf8"
          );
        }

        await this.clearDirectory(
          path.join(getProperty("temp_log_directory"), testCase.id),
          /.*/g
        );
        await rmdirSync(
          path.join(getProperty("temp_log_directory"), testCase.id)
        );

        assertions.set(testCase, additionalAssertions);
      }

      const testPath = path.join(
        getProperty("final_suite_directory"),
        `test-${key}.js`
      );
      await writeFileSync(
        testPath,
        this.stringifier.stringifyIndividual(
          reducedArchive.get(key)!,
          `${key}`,
          false,
          assertions
        )
      );
    }

    this.api.resetInstrumentationData();
  }
}
