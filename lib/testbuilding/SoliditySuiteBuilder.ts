import {Individual, Objective} from "syntest-framework";
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

    constructor(stringifier: Stringifier, api: any, truffle: any, config: any) {
        super(stringifier)
        this.api = api
        this.truffle = truffle
        this.config = config
    }


    async writeTest (filePath: string, individual: Individual, targetName: string, addLogs = false, additionalAssertions?: Map<Individual, { [p: string]: string }>) {
        await fs.writeFileSync(filePath, this.stringifier.stringifyIndividual(individual, targetName, addLogs, additionalAssertions))
    }

    async createSuite (archive: Map<Objective, Individual>) {
        const reducedArchive = new Map<string, Individual[]>()

        for (const key of archive.keys()) {
            const targetName = key.target.split("/").pop()!.split(".")[0]!

            if (!reducedArchive.has(targetName)) {
                reducedArchive.set(targetName, [])
            }

            if (reducedArchive.get(targetName)!.includes(<Individual>archive.get(key))) {
                // skip duplicate individuals (i.e. individuals which cover multiple objectives
                continue
            }

            reducedArchive.get(targetName)!.push(<Individual>archive.get(key))
        }


        for (const key of reducedArchive.keys()) {
            for (const individual of reducedArchive.get(key)!) {
                const testPath = path.resolve(this.config.testDir, `test${key}${individual.id}.js`)
                await this.writeTest(testPath, individual, "", true)
            }
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


        for (const key of reducedArchive.keys()) {
            const assertions = new Map()

            for (const individual of reducedArchive.get(key)!) {
                const additionalAssertions: { [key: string]: string } = {}
                // extract the log statements
                const dir = await fs.readdirSync(`temp_logs/${individual.id}`)
                dir.forEach((file: string) => {
                    additionalAssertions[file] = fs.readFileSync(`temp_logs/${individual.id}/${file}`)
                })
                await this.clearDirectory(`temp_logs/${individual.id}`, /.*/g)
                await fs.rmdirSync(`temp_logs/${individual.id}`)

                assertions.set(individual, additionalAssertions)
            }

            const testPath = path.resolve(this.config.testDir, `test-${key}.js`)
            await fs.writeFileSync(testPath, this.stringifier.stringifyIndividual(reducedArchive.get(key)!, `${key}`, false, assertions))
        }

        await fs.rmdirSync(`temp_logs`)

        this.api.resetInstrumentationData()
    }
}



