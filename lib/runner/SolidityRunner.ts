import {getLogger} from "syntest-framework";
import {Datapoint, Runner} from "syntest-framework";
import {SuiteBuilder} from "syntest-framework";
import {Individual} from "syntest-framework";

const truffleUtils = require('../../plugins/resources/truffle.utils');
const path = require('path')

export class SolidityRunner extends Runner{

    private api: any
    private truffle: any
    private config: any

    constructor(suiteBuilder: SuiteBuilder, api: any, truffle: any, config: any) {
        super(suiteBuilder);
        this.api = api
        this.truffle = truffle
        this.config = config
    }


    async runTest(individual: Individual): Promise<Datapoint[]> {
        // TODO very stupid but we have to create actual files for truffle to run...

        let testPath = path.resolve(this.config.testDir, 'tempTest.js')
        await this.suiteBuilder.writeTest(testPath, individual)

        this.config.test_files = await truffleUtils.getTestFilePaths(this.config);

        // Reset instrumentation data (no hits)
        this.api.resetInstrumentationData()

        let failures
        // Run tests

        try {
            failures = await this.truffle.test.run(this.config)
        } catch (e) {
            // TODO
        }

        if (failures) {
            // TODO maybe not stop? could be a bug that has been found
            getLogger().error('Test case has failed!')
            process.exit(1)
        }

        let datapoints = this.api.getInstrumentationData()

        this.api.resetInstrumentationData()
        // Remove test file
        await this.suiteBuilder.deleteTest(testPath)

        let finalpoints = []

        for (let key of Object.keys(datapoints)) {
            finalpoints.push(datapoints[key])
        }

        return finalpoints
    }

}