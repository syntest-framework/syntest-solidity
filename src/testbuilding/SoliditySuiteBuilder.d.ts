import { TestCaseDecoder, SuiteBuilder, TestCase, Archive } from "syntest-framework";
/**
 * @author Dimitri Stallenberg
 */
export declare class SoliditySuiteBuilder extends SuiteBuilder {
    private api;
    private truffle;
    private config;
    constructor(decoder: TestCaseDecoder, api: any, truffle: any, config: any);
    writeTestCase(filePath: string, testCase: TestCase, targetName: string, addLogs?: boolean, additionalAssertions?: Map<TestCase, {
        [p: string]: string;
    }>): Promise<void>;
    createSuite(archive: Archive<TestCase>): Promise<void>;
}
//# sourceMappingURL=SoliditySuiteBuilder.d.ts.map