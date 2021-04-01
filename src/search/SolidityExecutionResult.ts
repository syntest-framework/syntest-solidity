import { ExecutionResult, Datapoint } from "syntest-framework";

export class SolidityExecutionResult implements ExecutionResult {
  protected _dataPoints: Datapoint[];

  constructor(dataPoints: Datapoint[]) {
    this._dataPoints = dataPoints;
  }

  coversLine(line: number): boolean {
    for (const trace of this._dataPoints){
      if(trace.line === line && trace.hits>0)
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
