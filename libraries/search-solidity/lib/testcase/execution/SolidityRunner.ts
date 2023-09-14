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

import { Runner } from "mocha";
import { SolidityExecutionResult, SolidityExecutionStatus } from "../../search/SolidityExecutionResult";
import { SoliditySubject } from "../../search/SoliditySubject";
import { SolidityDecoder } from "../../testbuilding/SolidityDecoder";
import { getTestFilePaths } from "../../util/fileSystem";
import { SolidityTestCase } from "../SolidityTestCase";
import { EncodingRunner, ExecutionResult } from "@syntest/search"
import { Logger, getLogger } from "@syntest/logging"
import { StorageManager } from "@syntest/storage"
import path = require("node:path");

export class SolidityRunner implements EncodingRunner<SolidityTestCase> {
  protected static LOGGER: Logger;

  protected storageManager: StorageManager;
  protected decoder: SolidityDecoder;

  protected tempTestDirectory: string;

  protected executionTimeout: number;
  protected testTimeout: number;

  protected silenceTestOutput: boolean;

  // eslint-disable-next-line
  protected api: any;
  // eslint-disable-next-line
  protected truffle: any;
  // eslint-disable-next-line
  protected config: any;

  constructor(
    storageManager: StorageManager,
    decoder: SolidityDecoder,
    temporaryTestDirectory: string,
    executionTimeout: number,
    testTimeout: number,
    silenceTestOutput: boolean,
    // eslint-disable-next-line
    api: any,
    // eslint-disable-next-line
    truffle: any,
    // eslint-disable-next-line
    config: any
  ) {
    SolidityRunner.LOGGER = getLogger(SolidityRunner.name);
    this.storageManager = storageManager;
    this.decoder = decoder;
    this.tempTestDirectory = temporaryTestDirectory;
    this.executionTimeout = executionTimeout;
    this.testTimeout = testTimeout;
    this.silenceTestOutput = silenceTestOutput;

    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  async run(
    paths: string[],
    amount = 1
  ) {
    if (amount < 1) {
      throw new Error(`Amount of tests cannot be smaller than 1`);
    }
    paths = paths.map((p) => path.resolve(p));

    this.config.test_files = paths

    // Reset instrumentation data (no hits)
    this.api.resetInstrumentationData();

    // By replacing the global log function we disable the output of the truffle test framework
    const old = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = () => {};

    // Run tests
    try {
      await this.truffle.test.run(this.config);
    } catch (error) {
      // TODO
      SolidityRunner.LOGGER.error(error);
      console.trace(error);
    }
    console.log = old;

    // Retrieve execution information from the Mocha runner
    const mochaRunner: Runner = this.truffle.test.mochaRunner;
    const stats = mochaRunner.stats;

    // If one of the executions failed, log it
    if (stats.failures > 0) {
      SolidityRunner.LOGGER.error("Test case has failed!");
    }

        // Retrieve execution traces
        const instrumentationData = this.api.getInstrumentationData();

    return {
      suites: mochaRunner.suite.suites,
      stats: stats,
      instrumentationData: instrumentationData,
      metaData: {} // TODO
    }
  }

  async execute(
    subject: SoliditySubject,
    testCase: SolidityTestCase
  ): Promise<ExecutionResult> {
    SolidityRunner.LOGGER.silly("Executing test case");

    const decodedTestCase = this.decoder.decode(testCase, subject.name, false);

    const testPath = this.storageManager.store(
      [this.tempTestDirectory],
      "tempTest.spec.js",
      decodedTestCase,
      true
    );

    const { suites, stats, instrumentationData } = await this.run([
      testPath,
    ]);

    const traces = [];
    for (const key of Object.keys(instrumentationData)) {
      if (instrumentationData[key].path.includes(subject.name))
        traces.push(instrumentationData[key]);
    }

    // Retrieve execution information
    let executionResult: SolidityExecutionResult;
    if (
      suites.length > 0 &&
      suites[0].tests.length > 0
    ) {
      const test = suites[0].tests[0];

      let status: SolidityExecutionStatus;
      let error: Error | undefined
      if (test.isPassed()) {
        status = SolidityExecutionStatus.PASSED;
      } else if (test.timedOut) {
        status = SolidityExecutionStatus.TIMED_OUT;
      } else {
        status = SolidityExecutionStatus.FAILED;
        error = test.err
      }

      executionResult = new SolidityExecutionResult(
        status,
        traces,
        test.duration,
        error
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
    this.storageManager.deleteTemporary(
      [this.tempTestDirectory],
      "tempTest.spec.js"
    );
    
    return executionResult;
  }
}
