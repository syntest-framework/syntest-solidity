/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
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
/**
 * Copied from Soldity Coverage to override one of the imports
 */
const SolidityParser = require("@solidity-parser/parser");

const Injector = require("./injector"); // Local copy
const preprocess = require("solidity-coverage/lib/preprocessor");

const parse = require("./parse"); // Local copy

/**
 * Top level controller for the instrumentation sequence. Also hosts the instrumentation data map
 * which the vm step listener writes its output to. This only needs to be instantiated once
 * per coverage run.
 */
class Instrumenter {
  constructor(config = {}) {
    this.instrumentationData = {};
    this.injector = new Injector();
    this.measureStatementCoverage = config.measureStatementCoverage !== false;
    this.measureFunctionCoverage = config.measureFunctionCoverage !== false;
  }

  _isRootNode(node) {
    return (
      node.type === "ContractDefinition" ||
      node.type === "LibraryDefinition" ||
      node.type === "InterfaceDefinition"
    );
  }

  _initializeCoverageFields(contract) {
    contract.runnableLines = [];
    contract.fnMap = {};
    contract.fnId = 0;
    contract.branchMap = {};
    contract.branchId = 0;
    contract.statementMap = {};
    contract.statementId = 0;
    contract.injectionPoints = {};
  }

  /**
   * Per `contractSource`:
   * - wraps any unbracketed singleton consequents of if, for, while stmts (preprocessor.js)
   * - walks the file's AST, creating an instrumentation map (parse.js, registrar.js)
   * - injects `instrumentation` solidity statements into the target solidity source (injector.js)
   *
   * @param  {String} contractSource  solidity source code
   * @param  {String} fileName        absolute path to source file
   * @return {Object}                 instrumented `contract` object
   * {
   *   contract: instrumented solidity source code,
   *   contractName: contract name,
   *   runnableLines: integer
   * }
   *
   */
  instrument(contractSource, fileName) {
    const contract = {};

    contract.source = contractSource;
    contract.instrumented = contractSource;

    this._initializeCoverageFields(contract);
    parse.configureStatementCoverage(this.measureStatementCoverage);
    parse.configureFunctionCoverage(this.measureFunctionCoverage);

    // First, we run over the original contract to get the source mapping.
    let ast = SolidityParser.parse(contract.source, { loc: true, range: true });
    parse[ast.type](contract, ast);
    const returnValue = JSON.parse(JSON.stringify(contract)); // Possibly apotropaic.

    // Now, we reset almost everything and use the preprocessor to increase our effectiveness.
    this._initializeCoverageFields(contract);
    contract.instrumented = preprocess(contract.source);

    // Walk the AST, recording injection points
    ast = SolidityParser.parse(contract.instrumented, {
      loc: true,
      range: true,
    });

    const root = ast.children.filter((node) => this._isRootNode(node));

    // Handle contracts which only contain import statements
    contract.contractName = root.length > 0 ? root[0].name : null;
    parse[ast.type](contract, ast);
    // We have to iterate through these points in descending order
    const sortedPoints = Object.keys(contract.injectionPoints).sort(
      (a, b) => b - a
    );

    for (const injectionPoint of sortedPoints) {
      // Line instrumentation has to happen first
      contract.injectionPoints[injectionPoint].sort((a, b) => {
        const injections = ["injectBranch", "injectEmptyBranch", "injectLine"];
        return injections.indexOf(b.type) - injections.indexOf(a.type);
      });

      for (const injection of contract.injectionPoints[injectionPoint]) {
        this.injector[injection.type](
          contract,
          fileName,
          injectionPoint,
          injection,
          this.instrumentationData
        );
      }
    }

    returnValue.runnableLines = contract.runnableLines;
    returnValue.contract = contract.instrumented;
    returnValue.contractName = contract.contractName;
    returnValue.contracts = root.length > 0 ? root.map((n) => n.name) : null;
    return returnValue;
  }
}

module.exports = Instrumenter;
