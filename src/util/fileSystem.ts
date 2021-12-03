/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Solidity.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { existsSync, mkdirSync, rmdirSync, writeFileSync } from "fs";
import * as path from "path";

import { getUserInterface, Properties } from "@syntest/framework";
const globby = require("globby");
const recursive = require("recursive-readdir");
const globalModules = require("global-modules");

export async function setupTempFolders(
  tempArtifactsDir: string
) {
  if (existsSync(tempArtifactsDir)) {
    await rmdirSync(tempArtifactsDir, { recursive: true });
  }

  await mkdirSync(tempArtifactsDir, {
    recursive: true,
  });
}

export async function tearDownTempFolders(
  tempArtifactsDir: string
) {
  await rmdirSync(tempArtifactsDir, { recursive: true });
}

export async function createTruffleConfig() {
  const filepath = "./truffle-config.js";

  if (existsSync(filepath)) {
    return;
  }

  await writeFileSync(
    filepath,
    `module.exports = {
  test_directory: "${Properties.temp_test_directory}",
  plugins: ["@syntest/solidity"]
};`
  );
}

/**
 * Returns a list of test files to pass to mocha.
 * @param  {Object}   config  truffleConfig
 * @return {String[]}         list of files to pass to mocha
 */
export async function getTestFilePaths(config) {
  let target;

  // Handle --file <path|glob> cli option (subset of tests)
  typeof config.file === "string"
    ? (target = globby.sync([config.file]))
    : (target = await recursive(config.testDir));

  // Filter native solidity tests and warn that they're skipped
  const solregex = /.*\.(sol)$/;
  const hasSols = target.filter((f) => f.match(solregex) != null);

  if (hasSols.length > 0)
    getUserInterface().info("sol-tests " + [hasSols.length]);

  // Return list of test files
  const testregex = /.*\.(js|ts|es|es6|jsx)$/;
  return target.filter((f) => f.match(testregex) != null);
}

/**
 * Tries to load truffle module library and reports source. User can force use of
 * a non-local version using cli flags (see option). It's necessary to maintain
 * a fail-safe lib because feature was only introduced in 5.0.30. Load order is:
 *
 * 1. local node_modules
 * 2. global node_modules
 * 3. fail-safe (truffle lib v 5.0.31 at ./plugin-assets/truffle.library)
 *
 * @param  {Object} truffleConfig config
 * @return {Module}
 */
export function loadLibrary(config) {
  // Local
  try {
    if (config.useGlobalTruffle || config.usePluginTruffle) throw null;
    return require("truffle");
  } catch (err) {}

  // Global
  try {
    if (config.usePluginTruffle) throw null;

    const globalTruffle = path.join(globalModules, "truffle");
    return require(globalTruffle);
  } catch (err) {}
}
