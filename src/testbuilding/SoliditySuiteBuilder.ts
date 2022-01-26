/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Solidity.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Properties, Archive, getUserInterface } from "@syntest/framework";

import {
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import * as path from "path";
import { getTestFilePaths } from "../util/fileSystem";
import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { SolidityDecoder } from "./SolidityDecoder";

/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder {
  private decoder: SolidityDecoder;
  private api: any;
  private truffle: any;
  private readonly config: any;

  constructor(decoder: SolidityDecoder, api: any, truffle: any, config: any) {
    this.decoder = decoder;
    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  /**
   * Deletes a certain file.
   *
   * @param filepath  the filepath of the file to delete
   */
  async deleteTestCase(filepath: string) {
    try {
      await unlinkSync(filepath);
    } catch (error) {
      getUserInterface().debug(error);
    }
  }

  /**
   * Removes all files that match the given regex within a certain directory
   * @param dirPath   the directory to clear
   * @param match     the regex to which the files must match
   */
  async clearDirectory(dirPath: string, match = /.*\.(js)/g) {
    const dirContent = await readdirSync(dirPath);

    for (const file of dirContent.filter((el: string) => el.match(match))) {
      await unlinkSync(path.resolve(dirPath, file));
    }
  }

  async writeTestCase(
    filePath: string,
    testCase: SolidityTestCase,
    targetName: string,
    addLogs = false
  ) {
    const decodedTestCase = this.decoder.decode(
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
        this.decoder.decode(reducedArchive.get(key), `${key}`, false)
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
          const assertionValue = await readFileSync(
            path.join(Properties.temp_log_directory, testCase.id, file),
            "utf8"
          );
          assertions.set(file, assertionValue);
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
