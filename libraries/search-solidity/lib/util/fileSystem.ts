/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
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

import { existsSync, mkdirSync, rmdirSync, writeFileSync } from "node:fs";

import { CONFIG, getUserInterface } from "@syntest/search";
import globby = require("globby");
import recursive = require("recursive-readdir");

export async function createTruffleConfig() {
  const filepath = "./truffle-config.js";

  if (existsSync(filepath)) {
    return;
  }

  await writeFileSync(
    filepath,
    `module.exports = {
  test_directory: "${CONFIG.tempTestDirectory}",
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
  const hasSols = target.filter((f) => f.match(solregex) != undefined);

  if (hasSols.length > 0) LOGGER.info("sol-tests " + [hasSols.length]);

  // Return list of test files
  const testregex = /.*\.(js|ts|es|es6|jsx)$/;
  return target.filter((f) => f.match(testregex) != undefined);
}
