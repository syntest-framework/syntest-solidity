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
exports.generateDeployContracts = exports.generateInitialMigration = exports.createMigrationsContract = exports.createMigrationsDir = exports.removeMigrationsDir = void 0;
const fs_1 = require("fs");
const path = require("path");
function removeMigrationsDir() {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_1.rmdirSync(`migrations`, { recursive: true });
    });
}
exports.removeMigrationsDir = removeMigrationsDir;
function createMigrationsDir() {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeMigrationsDir();
        yield fs_1.mkdirSync(`migrations`);
    });
}
exports.createMigrationsDir = createMigrationsDir;
function createMigrationsContract() {
    return __awaiter(this, void 0, void 0, function* () {
        const file = `contracts/Migrations.sol`;
        if (fs_1.existsSync(file)) {
            return;
        }
        if (!fs_1.existsSync('contracts')) {
            yield fs_1.mkdirSync('contracts');
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
        yield fs_1.writeFileSync(file, text);
    });
}
exports.createMigrationsContract = createMigrationsContract;
function generateInitialMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        yield createMigrationsContract();
        const file = 'migrations/1_initial_migration.js';
        const text = `const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};

// the deployer has many advanced features we are not using yet,
// for more info goto:
// https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations
`;
        yield fs_1.writeFileSync(file, text);
    });
}
exports.generateInitialMigration = generateInitialMigration;
function generateDeployContracts(contracts, excluded) {
    return __awaiter(this, void 0, void 0, function* () {
        const file = 'migrations/2_deploy_contracts.js';
        const importsStatements = [];
        const deploymentStatements = [];
        const orderedContracts = [];
        // check and order for dependencies
        for (const contract of contracts) {
            const base = path.basename(contract.relativePath);
            const fileName = base.split('.')[0];
            // TODO this assumes that the contract has the same name as the file (not sure if thats a problem maybe we done need the contract name at all)
            // check if it is already included
            if (orderedContracts.includes(fileName)) {
                break;
            }
            const imports = contract.source.match(/import ["].*["];/g);
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
                        importsStatements.push(`const ${stripped} = artifacts.require("${stripped}");`);
                        deploymentStatements.push(`\tdeployer.deploy(${stripped});`);
                    }
                    // else add it before the current contract
                    orderedContracts.push(stripped);
                    // link to contract
                    deploymentStatements.push(`\tdeployer.link(${stripped}, ${fileName});`);
                }
            }
            orderedContracts.push(fileName);
            importsStatements.push(`const ${fileName} = artifacts.require("${fileName}");`);
            deploymentStatements.push(`\tdeployer.deploy(${fileName});`);
        }
        const text = [
            importsStatements.join('\n'),
            `module.exports = async function (deployer) {`,
            deploymentStatements.join('\n'),
            `};`
        ].join('\n\n');
        yield fs_1.writeFileSync(file, text);
    });
}
exports.generateDeployContracts = generateDeployContracts;
//# sourceMappingURL=deployment.js.map