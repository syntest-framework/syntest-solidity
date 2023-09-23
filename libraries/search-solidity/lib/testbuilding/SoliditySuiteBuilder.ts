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

import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { SolidityDecoder } from "./SolidityDecoder";
import { SolidityRunner } from "../testcase/execution/SolidityRunner";
import { StorageManager } from "@syntest/storage";
import { Target } from "@syntest/analysis";
/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder {
  private storageManager: StorageManager;
  private decoder: SolidityDecoder;
  private runner: SolidityRunner;

  constructor(
    storageManager: StorageManager,
    decoder: SolidityDecoder,
    runner: SolidityRunner
  ) {
    this.storageManager = storageManager;
    this.decoder = decoder;
    this.runner = runner;
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

  async runSuite(
    archive: Map<Target, SolidityTestCase[]>,
    sourceDirectory: string,
    testDirectory: string,
    gatherAssertionData: boolean,
    compact: boolean,
    final = false
  ) {
    const paths: string[] = [];

    let totalAmount = 0;
    if (compact) {
      for (const target of archive.keys()) {
        totalAmount += archive.get(target).length;
        const decodedTest = this.decoder.decode(
          archive.get(target),
          gatherAssertionData
        );
        const testPath = this.storageManager.store(
          [testDirectory],
          `test-${target}.spec.js`,
          decodedTest,
          !final
        );
        paths.push(testPath);
      }
    } else {
      for (const target of archive.keys()) {
        totalAmount += archive.get(target).length;
        for (const testCase of archive.get(target)) {
          const decodedTest = this.decoder.decode(testCase, gatherAssertionData);
          const testPath = this.storageManager.store(
            [testDirectory],
            `test${target}${testCase.id}.spec.js`,
            decodedTest,
            !final
          );

          paths.push(testPath);
        }
      }
    }

    if (final) {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }

    const { stats, instrumentationData, assertionData } = await this.runner.run(paths, totalAmount * 2);

    if (assertionData) {
      // put assertion data on testCases
      for (const [id, data] of Object.entries(assertionData)) {
        const testCase = [...archive.values()].flat().find((x) => x.id === id);
        if (!testCase) {
          throw new Error("invalid id");
        }

        testCase.assertionData = data;
      }
    }

        // TODO use the results of the tests to show some statistics

    return { stats, instrumentationData };
  }
}
