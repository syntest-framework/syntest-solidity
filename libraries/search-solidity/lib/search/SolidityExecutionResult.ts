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
import * as crypto from "node:crypto";

import { ExecutionResult, Trace } from "@syntest/search";

export enum SolidityExecutionStatus {
  PASSED,
  FAILED,
  TIMED_OUT,
}

/**
 * Solidity specific implementation of the execution results.
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
  protected _traces: Trace[];

  /**
   * Duration of the execution.
   * @protected
   */
  protected _duration: number;

  /**
   * Error of execution.
   * @protected
   */
  protected _error: Error | undefined;

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
    traces: Trace[],
    duration: number,
    error?: Error | undefined
  ) {
    this._status = status;
    this._traces = traces;
    this._duration = duration;
    this._error = error;

    for (const point of this._traces) {
      if (point.type === "requirePost") point.type = "probePost";

      if (point.type === "requirePre") point.type = "probePre";
      //point..satisfied = true;
    }
  }

  /**
   * @inheritDoc
   */
  public coversId(id: string): boolean {
    // if (
    //   this._status === JavaScriptExecutionStatus.INFINITE_LOOP ||
    //   this._status === JavaScriptExecutionStatus.MEMORY_OVERFLOW
    // ) {
    //   return false;
    // }

    if (id.startsWith("error:::")) {
      return this.hasError() && this.getErrorIdentifier() === id;
    }

    const trace = this._traces.find((trace) => trace.id === id);

    if (!trace) {
      if (id.startsWith("placeholder:::")) {
        // TODO maybe this already fixed?
        // TODO stupit hack because the placeholder nodes we add in the cfg are not being registred by the instrumentation
        // should fix
        return false;
      }

      throw new Error(
        `Could not find a matching trace for the given id: ${id}`
      );
    }

    return trace.hits > 0;
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
        trace.location.start.line === line &&
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
  public getError(): Error {
    return this._error;
  }

  public getErrorIdentifier(): string {
    let stack = this.getError().stack;

    stack = stack
      ? stack
          .split("\n")
          // only use location lines
          .filter((line) => line.startsWith("    at"))
          // only use locations within the source code (i.e. not from the generated tests)
          .filter((line) => line.includes("/instrumented/")) // stupid hack should be done better somehow, suffices for now
          .join("\n")
      : this.getError().message;

    return "error:::" + crypto.createHash("md5").update(stack).digest("hex");
  }

  /**
   * @inheritDoc
   */
  public getTraces(): Trace[] {
    return this._traces;
  }

  /**
   * @inheritDoc
   */
  public hasError(): boolean {
    return this._error !== null && this._error !== undefined;
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
