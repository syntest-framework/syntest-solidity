import { mkdirSync, rmdirSync, writeFileSync, existsSync } from "fs";
import * as path from "path";
import { TargetFile } from "syntest-framework";

export async function removeMigrationsDir() {
  await rmdirSync(`migrations`, { recursive: true });
}

export async function createMigrationsDir() {
  await removeMigrationsDir();
  await mkdirSync(`migrations`);
}

export async function createMigrationsContract() {
  const file = `contracts/Migrations.sol`;

  if (existsSync(file)) {
    return;
  }

  if (!existsSync("contracts")) {
    await mkdirSync("contracts");
  }

  const text = `// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  constructor() public {
    owner = msg.sender;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
`;
  await writeFileSync(file, text);
}

export async function generateInitialMigration() {
  const file = "migrations/1_initial_migration.js";
  const text = `const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};

// the deployer has many advanced features we are not using yet,
// for more info goto:
// https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations
`;

  await writeFileSync(file, text);
}

export async function generateDeployContracts(
  targetFiles: TargetFile[],
  excluded: string[]
) {
  const file = "migrations/2_deploy_contracts.js";
  const importsStatements = [];
  const deploymentStatements = [];

  const orderedContracts: string[] = [];

  // check and order for dependencies
  for (const targetFile of targetFiles) {
    for (const contract of targetFile.contracts) {
      // check if it is already included
      if (orderedContracts.includes(contract)) {
        break;
      }

      const imports = targetFile.source.match(/import ["].*["];/g);

      if (imports && imports.length) {
        for (const _import of imports) {
          let stripped = _import.split('"')[1];

          if (stripped.includes("/")) {
            stripped = path.basename(stripped);
          }

          if (stripped.includes(".")) {
            stripped = stripped.split(".")[0];
          }

          // TODO not sure if to include or exclude...
          // if (excluded.includes(stripped)) {
          //     continue
          // }

          // check if already in ordered
          if (!orderedContracts.includes(stripped)) {
            // if not in there add it to the deployment and import it
            importsStatements.push(
                `const ${stripped} = artifacts.require("${stripped}");`
            );
            deploymentStatements.push(`\tdeployer.deploy(${stripped});`);
          }

          // else add it before the current contract
          orderedContracts.push(stripped);

          // link to contract
          deploymentStatements.push(`\tdeployer.link(${stripped}, ${contract});`);
        }
      }

      orderedContracts.push(contract);
      importsStatements.push(
          `const ${contract} = artifacts.require("${contract}");`
      );
      deploymentStatements.push(`\tdeployer.deploy(${contract});`);
    }
  }

  const text = [
    importsStatements.join("\n"),
    `module.exports = async function (deployer) {`,
    deploymentStatements.join("\n"),
    `};`,
  ].join("\n\n");

  await writeFileSync(file, text);
}
