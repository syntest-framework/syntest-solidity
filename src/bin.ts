#!/usr/bin/env node

import { EventManager, PluginManager } from "@syntest/core";
import { SolidityLauncher } from "./SolidityLauncher";
import { SolidityTestCase } from "./testcase/SolidityTestCase";

const name = "syntest-solidity";
const state = {};
const eventManager = new EventManager<SolidityTestCase>(state);
const pluginManager = new PluginManager<SolidityTestCase>();
const launcher = new SolidityLauncher(name, eventManager, pluginManager);
launcher.run(process.argv);
