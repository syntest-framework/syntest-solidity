import { ExecutionResult, Datapoint } from "syntest-framework";
export declare enum SolidityExecutionStatus {
    PASSED = 0,
    FAILED = 1,
    TIMED_OUT = 2
}
/**
 * Solidity specific implementation of the execution results.
 *
 * @author Mitchell Olsthoorn
 */
export declare class SolidityExecutionResult implements ExecutionResult {
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
    constructor(status: SolidityExecutionStatus, traces: Datapoint[], duration: number, exception?: string);
    /**
     * @inheritDoc
     */
    coversLine(line: number): boolean;
    /**
     * @inheritDoc
     */
    getDuration(): number;
    /**
     * @inheritDoc
     */
    getExceptions(): string;
    /**
     * @inheritDoc
     */
    getTraces(): Datapoint[];
    /**
     * @inheritDoc
     */
    hasExceptions(): boolean;
    /**
     * @inheritDoc
     */
    hasPassed(): boolean;
    /**
     * @inheritDoc
     */
    hasTimedOut(): boolean;
}
//# sourceMappingURL=SolidityExecutionResult.d.ts.map