import {
  Properties,
  TestCaseDecoder,
  SuiteBuilder,
  Archive,
  ExceptionObjectiveFunction,
  getLogger,
} from "syntest-framework";
import * as path from "path";
import { getTestFilePaths } from "../util/fileSystem";
import { mfs } from "../memfs";

import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { readdirSync, readFileSync, rmdirSync } from "fs";

/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder extends SuiteBuilder {
  private api: any;
  private truffle: any;
  private config: any;

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
    addLogs = false,
    additionalAssertions?: Map<SolidityTestCase, { [p: string]: string }>
  ) {
    const decodedTestCase = this.decoder.decodeTestCase(
      testCase,
      targetName,
      addLogs,
      additionalAssertions
    );
    mfs.mkdirSync(Properties.temp_test_directory, { recursive: true });
    mfs.mkdirSync(Properties.temp_log_directory, { recursive: true });

    await mfs.writeFileSync(filePath, decodedTestCase);
  }

  async createSuite(archive: Archive<SolidityTestCase>) {
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
          .get(targetName)!
          .includes(archive.getEncoding(objective) as SolidityTestCase)
      ) {
        // skip duplicate individuals (i.e. individuals which cover multiple objectives
        continue;
      }

      reducedArchive
        .get(targetName)!
        .push(archive.getEncoding(objective) as SolidityTestCase);
    }

    for (const key of reducedArchive.keys()) {
      for (const testCase of reducedArchive.get(key)!) {
        const testPath = `test${key}${testCase.id}.js`;
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
      getLogger().error(e);
      console.trace(e);
    }
    console.log = old;

    // Create final tests files with additional assertions
    await this.clearDirectory(Properties.temp_test_directory);

    for (const key of reducedArchive.keys()) {
      const assertions = await this.gatherAssertions(reducedArchive, key);

      const testPath = path.join(
        Properties.final_suite_directory,
        `test-${key}.js`
      );
      await mfs.writeFileSync(
        testPath,
        this.decoder.decodeTestCase(
          reducedArchive.get(key)!,
          `${key}`,
          false,
          assertions
        )
      );
    }

    this.api.resetInstrumentationData();
  }

  async gatherAssertions(
    archive: Map<string, SolidityTestCase[]>,
    key: string
  ): Promise<Map<SolidityTestCase, { [p: string]: string }>> {
    const assertions = new Map();

    for (const testCase of archive.get(key)!) {
      const additionalAssertions: { [key: string]: string } = {};

      try {
        // extract the log statements
        const dir = await readdirSync(
          path.join(Properties.temp_log_directory, testCase.id)
        );

        for (const file of dir) {
          additionalAssertions[file] = await readFileSync(
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

      assertions.set(testCase, additionalAssertions);
    }

    return assertions;
  }
}
