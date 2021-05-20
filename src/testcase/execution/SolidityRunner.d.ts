import { ExecutionResult, SuiteBuilder, TestCase, TestCaseRunner } from "syntest-framework";
import { SoliditySubject } from "../../search/SoliditySubject";
export declare class SolidityRunner extends TestCaseRunner {
    protected api: any;
    protected truffle: any;
    protected config: any;
    constructor(suiteBuilder: SuiteBuilder, api: any, truffle: any, config: any);
    execute(subject: SoliditySubject<TestCase>, testCase: TestCase): Promise<ExecutionResult>;
}
//# sourceMappingURL=SolidityRunner.d.ts.map