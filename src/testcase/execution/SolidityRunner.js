"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityRunner = void 0;
const syntest_framework_1 = require("syntest-framework");
const path = require("path");
const SolidityExecutionResult_1 = require("../../search/SolidityExecutionResult");
const fileSystem_1 = require("../../util/fileSystem");
class SolidityRunner extends syntest_framework_1.TestCaseRunner {
    constructor(suiteBuilder, api, truffle, config) {
        super(suiteBuilder);
        this.api = api;
        this.truffle = truffle;
        this.config = config;
    }
    execute(subject, testCase) {
        return __awaiter(this, void 0, void 0, function* () {
            const testPath = path.join(syntest_framework_1.Properties.temp_test_directory, "tempTest.js");
            yield this.suiteBuilder.writeTestCase(testPath, testCase, testCase.root.constructorName);
            this.config.testDir = path.resolve(syntest_framework_1.Properties.temp_test_directory);
            this.config.test_files = yield fileSystem_1.getTestFilePaths(this.config);
            // Reset instrumentation data (no hits)
            this.api.resetInstrumentationData();
            // Run tests
            try {
                yield this.truffle.test.run(this.config);
            }
            catch (e) {
                // TODO
                syntest_framework_1.getLogger().error(e);
                console.trace(e);
            }
            // Retrieve execution information from the Mocha runner
            const mochaRunner = this.truffle.test.mochaRunner;
            const stats = mochaRunner.stats;
            // If one of the executions failed, log it
            if (stats.failures > 0) {
                syntest_framework_1.getLogger().error("Test case has failed!");
            }
            // Retrieve execution traces
            const instrumentationData = this.api.getInstrumentationData();
            const traces = [];
            for (const key of Object.keys(instrumentationData)) {
                if (instrumentationData[key].contractPath.includes(subject.name + ".sol"))
                    traces.push(instrumentationData[key]);
            }
            // Retrieve execution information
            let executionResult;
            if (mochaRunner.suite.suites.length > 0 &&
                mochaRunner.suite.suites[0].tests.length > 0) {
                const test = mochaRunner.suite.suites[0].tests[0];
                let status;
                let exception = null;
                if (test.isPassed()) {
                    status = SolidityExecutionResult_1.SolidityExecutionStatus.PASSED;
                }
                else if (test.timedOut) {
                    status = SolidityExecutionResult_1.SolidityExecutionStatus.TIMED_OUT;
                }
                else {
                    status = SolidityExecutionResult_1.SolidityExecutionStatus.FAILED;
                    exception = test.err.message;
                }
                const duration = test.duration;
                executionResult = new SolidityExecutionResult_1.SolidityExecutionResult(status, traces, duration, exception);
            }
            else {
                executionResult = new SolidityExecutionResult_1.SolidityExecutionResult(SolidityExecutionResult_1.SolidityExecutionStatus.FAILED, traces, stats.duration);
            }
            // Reset instrumentation data (no hits)
            this.api.resetInstrumentationData();
            // Remove test file
            yield this.suiteBuilder.deleteTestCase(this.config.test_files[0]);
            return executionResult;
        });
    }
}
exports.SolidityRunner = SolidityRunner;
//# sourceMappingURL=SolidityRunner.js.map