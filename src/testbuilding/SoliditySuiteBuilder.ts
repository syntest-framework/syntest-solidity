import {
  Properties,
  TestCaseDecoder,
  SuiteBuilder,
  TestCase,
  Archive,
  ExceptionObjectiveFunction,
} from "syntest-framework";
import { readdirSync, readFileSync, rmdirSync, writeFileSync } from "fs";
import * as path from "path";
import {getTestFilePaths} from "../util/fileSystem";

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
    testCase: TestCase,
    targetName: string,
    addLogs = false,
    additionalAssertions?: Map<TestCase, { [p: string]: string }>
  ) {
    const decodedTestCase = this.decoder.decodeTestCase(
      testCase,
      targetName,
      addLogs,
      additionalAssertions
    );
    await writeFileSync(filePath, decodedTestCase);
  }

  async createSuite(archive: Archive<TestCase>) {
    const reducedArchive = new Map<string, TestCase[]>();

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
          .includes(archive.getEncoding(objective) as TestCase)
      ) {
        // skip duplicate individuals (i.e. individuals which cover multiple objectives
        continue;
      }

      reducedArchive
        .get(targetName)!
        .push(archive.getEncoding(objective) as TestCase);
    }

    for (const key of reducedArchive.keys()) {
      for (const testCase of reducedArchive.get(key)!) {
        const testPath = path.join(
          Properties.temp_test_directory,
          `test${key}${testCase.id}.js`
        );
        await this.writeTestCase(testPath, testCase, "", true);
      }
    }
    console.log('x0' + process.cwd())

    this.config.test_files = await getTestFilePaths(this.config);

    console.log(this.config.test_files)
    // Run tests
    console.log('x1' + process.cwd())

    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
    }
    console.log('x2' + process.cwd())

    // Create final tests files with additional assertions
    await this.clearDirectory(Properties.temp_test_directory);

    for (const key of reducedArchive.keys()) {
      const assertions = new Map();

      for (const testCase of reducedArchive.get(key)!) {
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
        await rmdirSync(
          path.join(Properties.temp_log_directory, testCase.id)
        );
      }

      const testPath = path.join(
        Properties.final_suite_directory,
        `test-${key}.js`
      );
      await writeFileSync(
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
}
