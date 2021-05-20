"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityExecutionResult = exports.SolidityExecutionStatus = void 0;
var SolidityExecutionStatus;
(function (SolidityExecutionStatus) {
    SolidityExecutionStatus[SolidityExecutionStatus["PASSED"] = 0] = "PASSED";
    SolidityExecutionStatus[SolidityExecutionStatus["FAILED"] = 1] = "FAILED";
    SolidityExecutionStatus[SolidityExecutionStatus["TIMED_OUT"] = 2] = "TIMED_OUT";
})(SolidityExecutionStatus = exports.SolidityExecutionStatus || (exports.SolidityExecutionStatus = {}));
/**
 * Solidity specific implementation of the execution results.
 *
 * @author Mitchell Olsthoorn
 */
class SolidityExecutionResult {
    /**
     * Constructor.
     *
     * @param status The status of the execution
     * @param traces The traces of the execution
     * @param duration The duration of the execution
     * @param exception The exception of the execution
     */
    constructor(status, traces, duration, exception = null) {
        this._status = status;
        this._traces = traces;
        this._duration = duration;
        this._exception = exception;
        this._traces.forEach((point) => {
            if (point.type === "requirePost")
                point.type = "probePost";
            if (point.type === "requirePre")
                point.type = "probePre";
            //point..satisfied = true;
        });
    }
    /**
     * @inheritDoc
     */
    coversLine(line) {
        for (const trace of this._traces) {
            if ((trace.type === "statement" ||
                trace.type === "function" ||
                trace.type === "requirePre" ||
                trace.type === "branch") && // this line is needed for branches with no control dependent statements
                trace.line === line &&
                trace.hits > 0)
                return true;
        }
        return false;
    }
    /**
     * @inheritDoc
     */
    getDuration() {
        return this._duration;
    }
    /**
     * @inheritDoc
     */
    getExceptions() {
        return this._exception;
    }
    /**
     * @inheritDoc
     */
    getTraces() {
        return this._traces;
    }
    /**
     * @inheritDoc
     */
    hasExceptions() {
        return this._exception !== null;
    }
    /**
     * @inheritDoc
     */
    hasPassed() {
        return this._status === SolidityExecutionStatus.PASSED;
    }
    /**
     * @inheritDoc
     */
    hasTimedOut() {
        return this._status === SolidityExecutionStatus.TIMED_OUT;
    }
}
exports.SolidityExecutionResult = SolidityExecutionResult;
//# sourceMappingURL=SolidityExecutionResult.js.map