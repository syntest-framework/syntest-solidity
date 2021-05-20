import { Statement, TestCaseDecoder, TestCase } from "syntest-framework";
/**
 * @author Dimitri Stallenberg
 * @author Mitchell Olsthoorn
 */
export declare class SolidityTruffleStringifier implements TestCaseDecoder {
    decodeConstructor(statement: Statement): string;
    decodeStatement(statement: Statement): string;
    decodeFunctionCall(statement: Statement, objectName: string): string;
    getImport(statement: Statement): string;
    decodeTestCase(testCase: TestCase | TestCase[], targetName: string, addLogs?: boolean, additionalAssertions?: Map<TestCase, {
        [p: string]: string;
    }>): string;
}
//# sourceMappingURL=SolidityTruffleStringifier.d.ts.map