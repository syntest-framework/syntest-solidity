#!/usr/bin/env node

import {
    guessCWD,
    setupOptions,
    loadConfig,
    getProperty,
    processConfig,
    setupLogger,
    Fitness,
    createAlgorithmFromConfig, createCriterionFromConfig, getLogger
} from "syntest-framework";

import {SolidityTruffleStringifier} from "./testbuilding/SolidityTruffleStringifier";
import {SoliditySuiteBuilder} from "./testbuilding/SoliditySuiteBuilder";
import {SolidityRunner} from "./runner/SolidityRunner";
import {SolidityGeneOptionManager} from "./search/gene/SolidityGeneOptionManager";
import {SolidityRandomSampler} from "./search/sampling/SolidityRandomSampler";

const API = require('./api.js');
const utils = require('../plugins/resources/plugin.utils');
const truffleUtils = require('../plugins/resources/truffle.utils');
const Web3 = require('web3');
const path = require('path');
const death = require('death');
const TruffleConfig = require("@truffle/config");

// TODO get extra config options
// const {properties} = require('./properties')

const program = 'syntest-solidity'

async function start () {
    let truffleConfig = TruffleConfig.default()

    truffleConfig = truffleUtils.normalizeConfig(truffleConfig);


    death(utils.finish.bind(null, truffleConfig)); // Catch interrupt signals

    await guessCWD(null)

    const additionalOptions = {}
    setupOptions(program, additionalOptions)

    const args = process.argv.slice(process.argv.indexOf(program) + 1)
    const config = loadConfig(args)

    processConfig(config, args)
    setupLogger()

    const truffle = truffleUtils.loadLibrary(truffleConfig);
    const api = new API(config);


    truffleUtils.setNetwork(truffleConfig, api);


    // Server launch
    const client = api.client || truffle.ganache;
    const address = await api.ganache(client);

    const web3 = new Web3(address);
    const accounts = await web3.eth.getAccounts();

    truffleUtils.setNetworkFrom(truffleConfig, accounts);

    // Run post-launch server hook;
    await api.onServerReady(truffleConfig);

    // Instrument
    const skipFiles = api.skipFiles || [];
    skipFiles.push('Migrations.sol');

    let {
        targets,
        skipped
    } = utils.assembleFiles(truffleConfig, skipFiles);

    targets = api.instrument(targets);

    // Filesystem & Compiler Re-configuration
    const {
        tempArtifactsDir,
        tempContractsDir
    } = utils.getTempLocations(truffleConfig);

    utils.setupTempFolders(truffleConfig, tempContractsDir, tempArtifactsDir)
    utils.save(targets, truffleConfig.contracts_directory, tempContractsDir);
    utils.save(skipped, truffleConfig.contracts_directory, tempContractsDir);

    truffleConfig.contracts_directory = tempContractsDir;
    truffleConfig.build_directory = tempArtifactsDir;

    truffleConfig.contracts_build_directory = path.join(
        tempArtifactsDir,
        path.basename(truffleConfig.contracts_build_directory)
    );

    truffleConfig.all = true;
    truffleConfig.compilers.solc.settings.optimizer.enabled = false;

    // Compile Instrumented Contracts
    await truffle.contracts.compile(truffleConfig);
    await api.onCompileComplete(truffleConfig);

    // // TODO do this for each and every of the targets
    const stringifier = new SolidityTruffleStringifier(targets[1].instrumented.contractName)
    const suiteBuilder = new SoliditySuiteBuilder(stringifier, api, truffle, truffleConfig, targets[1])
    const runner = new SolidityRunner(suiteBuilder, api, truffle, truffleConfig)

    const FitnessObject = new Fitness(targets[1].instrumented.cfg, runner)
    const GeneOptionsObject = new SolidityGeneOptionManager(targets[1])
    const Sampler = new SolidityRandomSampler(GeneOptionsObject)

    const algorithm = createAlgorithmFromConfig(FitnessObject, GeneOptionsObject, Sampler)

    await suiteBuilder.clearDirectory(truffleConfig.testDir)

    // This searches for a covering population
    const population = await algorithm.search(createCriterionFromConfig())

    await suiteBuilder.createTests(population)

    truffleConfig.test_files = await truffleUtils.getTestFilePaths(truffleConfig);
    // Run tests
    try {
        const failures = await truffle.test.run(truffleConfig)
        getLogger().log(failures)
    } catch (e) {
        const error = e.stack;
        getLogger().log(error)
    }
    await api.onTestsComplete(truffleConfig)

    // Run Istanbul
    await api.report();
    await api.onIstanbulComplete(truffleConfig);


    // Finish
    await utils.finish(truffleConfig, api);
}

start()
