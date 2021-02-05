import {Individual} from "syntest-framework";
import {SuiteBuilder} from "syntest-framework";
import {Stringifier} from "syntest-framework";

const fs = require('fs')
const path = require('path')
const truffleUtils = require('../../plugins/resources/truffle.utils');

/**
 * @author Dimitri Stallenberg
 */
export class SoliditySuiteBuilder extends SuiteBuilder {

    private api: any
    private truffle: any
    private config: any
    private target: any

    constructor(stringifier: Stringifier, api: any, truffle: any, config: any, target: any) {
        super(stringifier)
        this.api = api
        this.truffle = truffle
        this.config = config
        this.target = target
    }

    async writeTest (filePath: string, individual: Individual, addLogs = false, additionalAssertions: { [key: string]: string } = {}) {
        let test = `const MetaCoin = artifacts.require("MetaCoin");\n\n`
            + `contract('${this.target['instrumented']['contractName']}', (accounts) => {\n`
            + this.stringifier.stringifyIndividual(individual, addLogs, additionalAssertions)
            + `\n})`

        if (addLogs) {
            test = `const fs = require('fs');\n\n` + test
        }

        await fs.writeFileSync(filePath, test)
    }

    async createTests (population: Individual[]) {
        for (let i = 0; i < population.length; i++) {
            const testPath = path.resolve(this.config.testDir, `test-${i}.js`)

            await this.writeTest(testPath, population[i], true)
        }

        this.config.test_files = await truffleUtils.getTestFilePaths(this.config);
        // Run tests
        try {
            await this.truffle.test.run(this.config)
        } catch (e) {
            // TODO
        }

        // Create final tests files with additional assertions
        await this.clearDirectory(this.config.testDir)

        for (let i = 0; i < population.length; i++) {
            const testPath = path.resolve(this.config.testDir, `test-${i}.js`)
            const additionalAssertions: { [key: string]: string } = {}
            // extract the log statements
            const dir = await fs.readdirSync(`${population[i].id}`)
            dir.forEach((file: string) => {
                additionalAssertions[file] = fs.readFileSync(`${population[i].id}/${file}`)
            })
            await this.clearDirectory(`${population[i].id}`, /.*/g)
            await fs.rmdirSync(`${population[i].id}`)

            await this.writeTest(testPath, population[i], false, additionalAssertions)
        }

        this.api.resetInstrumentationData()
    }
}



