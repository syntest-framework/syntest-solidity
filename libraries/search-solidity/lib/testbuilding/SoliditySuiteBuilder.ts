/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
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

import { Archive } from "@syntest/search";

import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { SolidityDecoder } from "./SolidityDecoder";
import { SolidityRunner } from "../testcase/execution/SolidityRunner";
import { StorageManager } from "@syntest/storage";
/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder {
  private storageManager: StorageManager;
  private decoder: SolidityDecoder;
  private runner: SolidityRunner;
  private tempLogDirectory: string;

  constructor(
    storageManager: StorageManager,
    decoder: SolidityDecoder,
    runner: SolidityRunner,
    temporaryLogDirectory: string
  ) {
    this.storageManager = storageManager;
    this.decoder = decoder;
    this.runner = runner;
    this.tempLogDirectory = temporaryLogDirectory;
  }

  reduceArchive(
    archive: Archive<SolidityTestCase>
  ): Map<string, SolidityTestCase[]> {
    const reducedArchive = new Map<string, SolidityTestCase[]>();

    for (const objective of archive.getObjectives()) {
      const targetName = objective
        .getSubject()
        .name.split("/")
        .pop()
        .split(".")[0];

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

  createSuite(
    archive: Map<string, SolidityTestCase[]>,
    sourceDirectory: string,
    testDirectory: string,
    addLogs: boolean,
    compact: boolean,
    final = false
  ): string[] {
    const paths: string[] = [];

    // write the test cases with logs to know what to assert
    if (compact) {
      for (const key of archive.keys()) {
        const decodedTest = this.decoder.decode(
          archive.get(key),
          `${key}`,
          addLogs
        );
        const testPath = this.storageManager.store(
          [testDirectory],
          `test-${key}.spec.js`,
          decodedTest,
          !final
        );
        paths.push(testPath);
      }
    } else {
      for (const key of archive.keys()) {
        for (const testCase of archive.get(key)) {
          const decodedTest = this.decoder.decode(
            testCase,
            "",
            addLogs
          );
          const testPath = this.storageManager.store(
            [testDirectory],
            `test${key}${testCase.id}.spec.js`,
            decodedTest,
            !final
          );

          paths.push(testPath);
        }
      }
    }

    return paths;
  }

  async runSuite(paths: string[], amount: number) {
    const { stats, instrumentationData } = await this.runner.run(paths, amount);
    // TODO use the results of the tests to show some statistics

    return { stats, instrumentationData };
  }

  async gatherAssertions(testCases: SolidityTestCase[]): Promise<void> {
    for (const testCase of testCases) {
      const assertions = new Map<string, string>();
      try {
        // extract the log statements
        const logDiretory = await readdirSync(
          path.join(this.tempLogDirectory, testCase.id)
        );

        for (const file of logDiretory) {
          const assertionValue = await readFileSync(
            path.join(this.tempLogDirectory, testCase.id, file),
            "utf8"
          );
          assertions.set(file, assertionValue);
        }
      } catch {
        continue;
      }

      this.storageManager.clearTemporaryDirectory([
        this.tempLogDirectory,
        testCase.id,
      ]);
      this.storageManager.deleteTemporaryDirectory([
        this.tempLogDirectory,
        testCase.id,
      ]);

      testCase.assertions = assertions;
    }
  }
}
