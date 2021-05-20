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
exports.SoliditySuiteBuilder = void 0;
const syntest_framework_1 = require("syntest-framework");
const fs_1 = require("fs");
const path = require("path");
const fileSystem_1 = require("../util/fileSystem");
/**
 * @author Dimitri Stallenberg
 */
class SoliditySuiteBuilder extends syntest_framework_1.SuiteBuilder {
    constructor(decoder, api, truffle, config) {
        super(decoder);
        this.api = api;
        this.truffle = truffle;
        this.config = config;
    }
    writeTestCase(filePath, testCase, targetName, addLogs = false, additionalAssertions) {
        return __awaiter(this, void 0, void 0, function* () {
            const decodedTestCase = this.decoder.decodeTestCase(testCase, targetName, addLogs, additionalAssertions);
            yield fs_1.writeFileSync(filePath, decodedTestCase);
        });
    }
    createSuite(archive) {
        return __awaiter(this, void 0, void 0, function* () {
            const reducedArchive = new Map();
            for (const objective of archive.getObjectives()) {
                const targetName = objective
                    .getSubject()
                    .name.split("/")
                    .pop()
                    .split(".")[0];
                if (!reducedArchive.has(targetName)) {
                    reducedArchive.set(targetName, []);
                }
                if (reducedArchive
                    .get(targetName)
                    .includes(archive.getEncoding(objective))) {
                    // skip duplicate individuals (i.e. individuals which cover multiple objectives
                    continue;
                }
                reducedArchive
                    .get(targetName)
                    .push(archive.getEncoding(objective));
            }
            for (const key of reducedArchive.keys()) {
                for (const testCase of reducedArchive.get(key)) {
                    const testPath = path.join(syntest_framework_1.Properties.temp_test_directory, `test${key}${testCase.id}.js`);
                    yield this.writeTestCase(testPath, testCase, "", true);
                }
            }
            console.log('x0' + process.cwd());
            this.config.test_files = yield fileSystem_1.getTestFilePaths(this.config);
            console.log(this.config.test_files);
            // Run tests
            console.log('x1' + process.cwd());
            try {
                yield this.truffle.test.run(this.config);
            }
            catch (e) {
                // TODO
            }
            console.log('x2' + process.cwd());
            // Create final tests files with additional assertions
            yield this.clearDirectory(syntest_framework_1.Properties.temp_test_directory);
            for (const key of reducedArchive.keys()) {
                const assertions = new Map();
                for (const testCase of reducedArchive.get(key)) {
                    const additionalAssertions = {};
                    try {
                        // extract the log statements
                        const dir = yield fs_1.readdirSync(path.join(syntest_framework_1.Properties.temp_log_directory, testCase.id));
                        for (const file of dir) {
                            additionalAssertions[file] = yield fs_1.readFileSync(path.join(syntest_framework_1.Properties.temp_log_directory, testCase.id, file), "utf8");
                        }
                    }
                    catch (error) {
                        continue;
                    }
                    yield this.clearDirectory(path.join(syntest_framework_1.Properties.temp_log_directory, testCase.id), /.*/g);
                    yield fs_1.rmdirSync(path.join(syntest_framework_1.Properties.temp_log_directory, testCase.id));
                }
                const testPath = path.join(syntest_framework_1.Properties.final_suite_directory, `test-${key}.js`);
                yield fs_1.writeFileSync(testPath, this.decoder.decodeTestCase(reducedArchive.get(key), `${key}`, false, assertions));
            }
            this.api.resetInstrumentationData();
        });
    }
}
exports.SoliditySuiteBuilder = SoliditySuiteBuilder;
//# sourceMappingURL=SoliditySuiteBuilder.js.map