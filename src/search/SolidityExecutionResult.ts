import { ExecutionResult, Datapoint } from "syntest-framework";

export class SolidityExecutionResult implements ExecutionResult {
  protected _dataPoints: Datapoint[];

  constructor(dataPoints: Datapoint[]) {
    this._dataPoints = dataPoints;
    this._dataPoints.forEach((point) => {
      if (point.type === "requirePost")
        point.type = "probePost";

      if (point.type === "requirePre")
        point.type = "probePre";
        //point..satisfied = true;
    })
  }

  coversLine(line: number): boolean {
    for (const trace of this._dataPoints) {
      if ((trace.type === "statement" || trace.type === "function" || trace.type === "requirePre")
          && trace.line === line
          && trace.hits > 0)
        return true;
    }
    return false;
  }

  getTraces(): Datapoint[] {
    return this._dataPoints;
  }

  hasExceptions(): boolean {
    return false;
  }

  hasTimeout(): boolean {
    return false;
  }
}
