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

import { Runner, Suite } from "mocha";
import {
  SolidityExecutionResult,
  SolidityExecutionStatus,
} from "../../search/SolidityExecutionResult";
import { SolidityDecoder } from "../../testbuilding/SolidityDecoder";
import { SolidityTestCase } from "../SolidityTestCase";
import { EncodingRunner, ExecutionResult, Trace } from "@syntest/search";
import { Logger, getLogger } from "@syntest/logging";
import { StorageManager } from "@syntest/storage";
import path = require("node:path");
import { AssertionData } from "./AssertionData";
import {
  InstrumentationData,
  InstrumentationDataMap,
  MetaData,
} from "@syntest/analysis-solidity";
import { MetaDataMap } from "@syntest/analysis-solidity";

export type Result = {
  suites: Suite[];
  stats: Mocha.Stats;
  instrumentationData: InstrumentationDataMap;
  metaData: MetaDataMap;
  assertionData?: AssertionData;
  error?: string;
};

export class SolidityRunner implements EncodingRunner<SolidityTestCase> {
  protected static LOGGER: Logger;

  protected storageManager: StorageManager;
  protected decoder: SolidityDecoder;

  protected tempTestDirectory: string;

  protected executionTimeout: number;
  protected testTimeout: number;

  protected silenceTestOutput: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected truffle: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected config: any;

  constructor(
    storageManager: StorageManager,
    decoder: SolidityDecoder,
    temporaryTestDirectory: string,
    executionTimeout: number,
    testTimeout: number,
    silenceTestOutput: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    truffle: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async run(paths: string[], amount = 1): Promise<Result> {
    if (amount < 1) {
      throw new Error(`Amount of tests cannot be smaller than 1`);
    }
    paths = paths.map((p) => path.resolve(p));

    this.config.test_files = paths;

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
      metaData: {}, // TODO
      assertionData: {}, // TODO
    };
  }

  async execute(testCase: SolidityTestCase): Promise<ExecutionResult> {
    SolidityRunner.LOGGER.silly("Executing test case");

    const decodedTestCase = this.decoder.decode(testCase);

    const testPath = this.storageManager.store(
      [this.tempTestDirectory],
      "tempTest.spec.js",
      decodedTestCase,
      true
    );

    const { suites, stats, instrumentationData, metaData } = await this.run([
      testPath,
    ]);

    const traces: Trace[] = this.extractTraces(instrumentationData, metaData);

    // Retrieve execution information
    let executionResult: SolidityExecutionResult;
    if (suites.length > 0 && suites[0].tests.length > 0) {
      const test = suites[0].tests[0];

      let status: SolidityExecutionStatus;
      let error: Error | undefined;
      if (test.isPassed()) {
        status = SolidityExecutionStatus.PASSED;
      } else if (test.timedOut) {
        status = SolidityExecutionStatus.TIMED_OUT;
      } else {
        status = SolidityExecutionStatus.FAILED;
        error = test.err;
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

  extractTraces(
    instrumentationData: InstrumentationDataMap,
    metaData: MetaDataMap
  ): Trace[] {
    const traces: Trace[] = [];

    for (const key of Object.keys(instrumentationData)) {
      for (const functionKey of Object.keys(instrumentationData[key].fnMap)) {
        const function_ = instrumentationData[key].fnMap[functionKey];
        const hits = instrumentationData[key].f[functionKey];

        traces.push({
          id: function_.decl.id,
          type: "function",
          path: key,
          location: function_.decl,

          hits: hits,
        });
      }

      for (const statementKey of Object.keys(
        instrumentationData[key].statementMap
      )) {
        const statement = instrumentationData[key].statementMap[statementKey];
        const hits = instrumentationData[key].s[statementKey];

        traces.push({
          id: statement.id,
          type: "statement",
          path: key,
          location: statement,

          hits: hits,
        });
      }

      traces.push(
        ...this._extractBranchTraces(
          key,
          instrumentationData[key],
          metaData !== undefined && key in metaData ? metaData[key] : undefined
        )
      );
    }

    return traces;
  }

  private _extractBranchTraces(
    key: string,
    instrumentationData: InstrumentationData,
    metaData: MetaData
  ): Trace[] {
    const traces: Trace[] = [];
    for (const branchKey of Object.keys(instrumentationData.branchMap)) {
      const branch = instrumentationData.branchMap[branchKey];
      const hits = <number[]>instrumentationData.b[branchKey];
      let meta;

      if (metaData !== undefined) {
        const metaMeta = metaData.meta;
        meta = metaMeta[branchKey.toString()];
      }

      for (const [index, location] of branch.locations.entries()) {
        traces.push({
          id: location.id,
          path: key,
          type: "branch",
          location: branch.locations[index],

          hits: hits[index],

          condition: meta?.condition,
          variables: meta?.variables,
        });
      }

      if (
        !(
          branch.locations.length > 2 || // more than 2 means switch
          branch.locations.length === 2 || // equal to 2 means if statement (or small switch)
          (branch.locations.length === 1 && branch.type === "default-arg")
        ) // equal to 1 means default arg
      ) {
        // otherwise something is wrong
        throw new Error(
          `Invalid number of locations for branch type: ${branch.type}`
        );
      }
    }

    return traces;
  }
}
