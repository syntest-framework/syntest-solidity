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

import { ExecutionResult, Datapoint } from "@syntest/framework";

export enum SolidityExecutionStatus {
  PASSED,
  FAILED,
  TIMED_OUT,
}

/**
 * Solidity specific implementation of the execution results.
 *
 * @author Mitchell Olsthoorn
 */
export class SolidityExecutionResult implements ExecutionResult {
  /**
   * Execution status.
   * @protected
   */
  protected _status: SolidityExecutionStatus;

  /**
   * Array of traces of the execution.
   * @protected
   */
  protected _traces: Datapoint[];

  /**
   * Duration of the execution.
   * @protected
   */
  protected _duration: number;

  /**
   * Exception of execution.
   * @protected
   */
  protected _exception: string;

  /**
   * Constructor.
   *
   * @param status The status of the execution
   * @param traces The traces of the execution
   * @param duration The duration of the execution
   * @param exception The exception of the execution
   */
  public constructor(
    status: SolidityExecutionStatus,
    traces: Datapoint[],
    duration: number,
    exception: string = null
  ) {
    this._status = status;
    this._traces = traces;
    this._duration = duration;
    this._exception = exception;

    this._traces.forEach((point) => {
      if (point.type === "requirePost") point.type = "probePost";

      if (point.type === "requirePre") point.type = "probePre";
      //point..satisfied = true;
    });
  }

  /**
   * @inheritDoc
   */
  public coversLine(line: number): boolean {
    for (const trace of this._traces) {
      if (
        (trace.type === "statement" ||
          trace.type === "function" ||
          trace.type === "requirePre" ||
          trace.type === "branch") && // this line is needed for branches with no control dependent statements
        trace.line === line &&
        trace.hits > 0
      )
        return true;
    }
    return false;
  }

  /**
   * @inheritDoc
   */
  public getDuration(): number {
    return this._duration;
  }

  /**
   * @inheritDoc
   */
  public getExceptions(): string {
    return this._exception;
  }

  /**
   * @inheritDoc
   */
  public getTraces(): Datapoint[] {
    return this._traces;
  }

  /**
   * @inheritDoc
   */
  public hasExceptions(): boolean {
    return this._exception !== null;
  }

  /**
   * @inheritDoc
   */
  public hasPassed(): boolean {
    return this._status === SolidityExecutionStatus.PASSED;
  }

  /**
   * @inheritDoc
   */
  public hasTimedOut(): boolean {
    return this._status === SolidityExecutionStatus.TIMED_OUT;
  }
}
