import {mkdirSync, rmdirSync, writeFileSync} from "fs";
import * as path from 'path'

export async function createMigrationsDir() {
    await rmdirSync(`migrations`, { recursive: true });
    await mkdirSync(`migrations`);
}

export async function generateInitialMigration () {
    const file = 'migrations/1_initial_migration.js'
    const text = `const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
`

    await writeFileSync(file, text)
}

export async function generateDeployContracts(contracts: string[]) {
    const file = 'migrations/2_deploy_contracts.js'
    const imports = []
    const deployments = []
    // TODO check for dependencies

    for (const contract of contracts) {
        console.log(contract)
        const base = path.basename(contract)
        const name = base.split('.')[0]

        // TODO this assumes that the contract has the same name as the file
        imports.push(`const ${name} = artifacts.require("${name}");`)
        deployments.push(`\tdeployer.deploy(${name});`)
    }

    const text = [
        imports.join('\n'),
        `module.exports = async function (deployer) {`,
        deployments.join('\n'),
        `};`
    ].join('\n\n')

    await writeFileSync(file, text)
}
