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

import {
  ExecutionResult,
  Properties,
  getUserInterface,
  EncodingRunner,
} from "@syntest/framework";

import * as path from "path";
import {
  SolidityExecutionResult,
  SolidityExecutionStatus,
} from "../../search/SolidityExecutionResult";
import { Runner } from "mocha";
import { SoliditySubject } from "../../search/SoliditySubject";
import { getTestFilePaths } from "../../util/fileSystem";
import { SolidityTestCase } from "../SolidityTestCase";
import { SoliditySuiteBuilder } from "../../testbuilding/SoliditySuiteBuilder";

export class SolidityRunner implements EncodingRunner<SolidityTestCase> {
  protected suiteBuilder: SoliditySuiteBuilder;
  protected api: any;
  protected truffle: any;
  protected config: any;

  constructor(
    suiteBuilder: SoliditySuiteBuilder,
    api: any,
    truffle: any,
    config: any
  ) {
    this.suiteBuilder = suiteBuilder;
    this.api = api;
    this.truffle = truffle;
    this.config = config;
  }

  async execute(
    subject: SoliditySubject,
    testCase: SolidityTestCase
  ): Promise<ExecutionResult> {
    const testPath = path.join(Properties.temp_test_directory, "tempTest.js");
    await this.suiteBuilder.writeTestCase(testPath, testCase, subject.name);

    this.config.test_files = await getTestFilePaths(this.config);

    // Reset instrumentation data (no hits)
    this.api.resetInstrumentationData();

    // By replacing the global log function we disable the output of the truffle test framework
    const old = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = () => {};

    // Run tests
    try {
      await this.truffle.test.run(this.config);
    } catch (e) {
      // TODO
      getUserInterface().error(e);
      console.trace(e);
    }
    console.log = old;

    // Retrieve execution information from the Mocha runner
    const mochaRunner: Runner = this.truffle.test.mochaRunner;
    const stats = mochaRunner.stats;

    // If one of the executions failed, log it
    if (stats.failures > 0) {
      getUserInterface().error("Test case has failed!");
    }

    // Retrieve execution traces
    const instrumentationData = this.api.getInstrumentationData();

    const traces = [];
    for (const key of Object.keys(instrumentationData)) {
      if (instrumentationData[key].path.includes(subject.name))
        traces.push(instrumentationData[key]);
    }

    // Retrieve execution information
    let executionResult: SolidityExecutionResult;
    if (
      mochaRunner.suite.suites.length > 0 &&
      mochaRunner.suite.suites[0].tests.length > 0
    ) {
      const test = mochaRunner.suite.suites[0].tests[0];

      let status: SolidityExecutionStatus;
      let exception: string = null;

      if (test.isPassed()) {
        status = SolidityExecutionStatus.PASSED;
      } else if (test.timedOut) {
        status = SolidityExecutionStatus.TIMED_OUT;
      } else {
        status = SolidityExecutionStatus.FAILED;
        exception = test.err.message;
      }

      const duration = test.duration;

      executionResult = new SolidityExecutionResult(
        status,
        traces,
        duration,
        exception
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
    await this.suiteBuilder.deleteTestCase(this.config.test_files[0]);

    return executionResult;
  }
}
