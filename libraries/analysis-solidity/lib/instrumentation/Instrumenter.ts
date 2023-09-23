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
import { StorageManager } from "@syntest/storage";
import { RootContext, Target } from "@syntest/analysis-solidity";
import path = require("node:path");
import { InstrumentationData } from "./datastructures/InstrumentationData";

import * as SolidityParser from "@solidity-parser/parser";
import { ASTNode } from "@solidity-parser/parser/dist/src/ast-types";

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const Injector = require("./injector"); // Local copy
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const preprocess = require("solidity-coverage/lib/preprocessor");
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const parse = require("./parse"); // Local copy

export class Instrumenter {
  protected instrumentationData;
  protected injector;

  constructor() {
    this.instrumentationData = {};
    this.injector = new Injector();
  }

  async instrumentAll(
    storageManager: StorageManager,
    rootContext: RootContext,
    targets: Target[],
    instrumentedDirectory: string,
    api: any
  ) {
    const absoluteRootPath = path.resolve(rootContext.rootPath);
    const destinationPath = path.join(
      instrumentedDirectory,
      path.basename(absoluteRootPath)
    );
    // copy everything
    storageManager.copyToTemporaryDirectory(
      [absoluteRootPath],
      destinationPath.split(path.sep)
    );

    // overwrite the stuff that needs instrumentation

    const targetPaths = [...targets.values()].map((target) => target.path);

    for (const targetPath of targetPaths) {
      const source = rootContext.getSource(targetPath);
      const instrumented = await this.instrument(source, targetPath);

      api.coverage.addContract(instrumented, targetPath);

      const _path = path
        .normalize(targetPath)
        .replace(absoluteRootPath, destinationPath);

      const directory = path.dirname(_path);
      const file = path.basename(_path);

      storageManager.store(
        directory.split(path.sep),
        file,
        instrumented.contract,
        true
      );
    }
  }

  _isRootNode(node: ASTNode) {
    return (
      node.type === "ContractDefinition" //||
      // node.type === "LibraryDefinition" ||
      // node.type === "InterfaceDefinition"
    );
  }

  /**
   * Per `contractSource`:
   * - wraps any unbracketed singleton consequents of if, for, while stmts (preprocessor.js)
   * - walks the file's AST, creating an instrumentation map (parse.js, registrar.js)
   * - injects `instrumentation` solidity statements into the target solidity source (injector.js)
   *
   * @param  {String} code  solidity source code
   * @param  {String} fileName        absolute path to source file
   * @return {Object}                 instrumented `contract` object
   * {
   *   contract: instrumented solidity source code,
   *   contractName: contract name,
   *   runnableLines: integer
   * }
   *
   */
  async instrument(code: string, fileName: string) {
    const contract: InstrumentationData = {
      source: code,
      instrumented: code,
      contractName: undefined,
      runnableLines: [],

      fnId: 0,
      branchId: 0,
      statementId: 0,
      injectionPoints: {},

      fnMap: {},
      branchMap: {},
      statementMap: {},

      s: {},
      f: {},
      b: {}
    };

    parse.configureStatementCoverage(true);
    parse.configureFunctionCoverage(true);

    // First, we run over the original contract to get the source mapping.
    let ast = SolidityParser.parse(contract.source, { loc: true, range: true });
    parse[ast.type](contract, ast);
    const returnValue = JSON.parse(JSON.stringify(contract)); // Possibly apotropaic.

    // Now, we reset almost everything and use the preprocessor to increase our effectiveness.
    contract.runnableLines = [];
    contract.fnMap = {};
    contract.fnId = 0;
    contract.branchMap = {};
    contract.branchId = 0;
    contract.statementMap = {};
    contract.statementId = 0;
    contract.injectionPoints = {};
    contract.instrumented = preprocess(contract.source);

    // Walk the AST, recording injection points
    ast = SolidityParser.parse(contract.instrumented, {
      loc: true,
      range: true,
    });

    const root = ast.children.filter((node) => this._isRootNode(node));

    // Handle contracts which only contain import statements
    contract.contractName =
      root.length > 0 && "name" in root[0] ? root[0].name : undefined;
    parse[ast.type](contract, ast);
    // We have to iterate through these points in descending order
    const sortedPoints = Object.keys(contract.injectionPoints)
      .map((x) => Number.parseInt(x))
      .sort((a, b) => b - a);

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
    returnValue.contracts =
      root.length > 0
        ? root.map((n) => ("name" in n ? n.name : ""))
        : undefined;
    return returnValue;
  }
}
