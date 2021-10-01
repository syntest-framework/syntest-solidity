import {
  Properties,
  TestCaseDecoder,
  SuiteBuilder,
  Archive,
  getUserInterface,
} from "@syntest/framework";

import { readdirSync, readFileSync, rmdirSync, writeFileSync } from "fs";
import * as path from "path";
import { getTestFilePaths } from "../util/fileSystem";
import { SolidityTestCase } from "../testcase/SolidityTestCase";

/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder extends SuiteBuilder {
  private api: any;
  private truffle: any;
  private readonly config: any;

  constructor(decoder: TestCaseDecoder, api: any, truffle: any, config: any) {
    super(decoder);
    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  async writeTestCase(
    filePath: string,
    testCase: SolidityTestCase,
    targetName: string,
    addLogs = false
  ) {
    const decodedTestCase = this.decoder.decodeTestCase(
      testCase,
      targetName,
      addLogs
    );
    await writeFileSync(filePath, decodedTestCase);
  }

  reduceArchive(
    archive: Archive<SolidityTestCase>
  ): Map<string, SolidityTestCase[]> {
    const reducedArchive = new Map<string, SolidityTestCase[]>();

    for (const objective of archive.getObjectives()) {
      const targetName = objective
        .getSubject()
        .name.split("/")
        .pop()!
        .split(".")[0]!;

      if (!reducedArchive.has(targetName)) {
        reducedArchive.set(targetName, []);
      }

      if (
        reducedArchive
          .get(targetName)
          .includes(archive.getEncoding(objective) as SolidityTestCase)
      ) {
        // skip duplicate individuals (i.e. individuals which cover multiple objectives
        continue;
      }

      reducedArchive
        .get(targetName)
        .push(archive.getEncoding(objective) as SolidityTestCase);
    }

    return reducedArchive;
  }

  async createSuite(archive: Archive<SolidityTestCase>): Promise<void> {
    const reducedArchive = this.reduceArchive(archive);

    // write the test cases with logs to know what to assert
    for (const key of reducedArchive.keys()) {
      for (const testCase of reducedArchive.get(key)!) {
        const testPath = path.join(
          Properties.temp_test_directory,
          `test${key}${testCase.id}.js`
        );
        await this.writeTestCase(testPath, testCase, "", true);
      }
    }

    this.config.test_files = await getTestFilePaths(this.config);

    // Run tests
    const old = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = function () {};
    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
      getUserInterface().error(e);
      console.trace(e);
    }
    console.log = old;

    // Create final tests files with assertions
    await this.clearDirectory(Properties.temp_test_directory);

    for (const key of reducedArchive.keys()) {
      await this.gatherAssertions(reducedArchive.get(key));
      const testPath = path.join(
        Properties.final_suite_directory,
        `test-${key}.js`
      );
      await writeFileSync(
        testPath,
        this.decoder.decodeTestCase(reducedArchive.get(key), `${key}`, false)
      );
    }

    this.api.resetInstrumentationData();
  }

  async gatherAssertions(testCases: SolidityTestCase[]): Promise<void> {
    for (const testCase of testCases) {
      const assertions = new Map<string, string>();
      try {
        // extract the log statements
        const dir = await readdirSync(
          path.join(Properties.temp_log_directory, testCase.id)
        );

        for (const file of dir) {
          assertions[file] = await readFileSync(
            path.join(Properties.temp_log_directory, testCase.id, file),
            "utf8"
          );
        }
      } catch (error) {
        continue;
      }

      await this.clearDirectory(
        path.join(Properties.temp_log_directory, testCase.id),
        /.*/g
      );
      await rmdirSync(path.join(Properties.temp_log_directory, testCase.id));

      testCase.assertions = assertions;
    }
  }
}
