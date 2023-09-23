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

import { Parameter } from "@syntest/analysis-solidity";
import { Logger, getLogger } from "@syntest/logging";
import { Statement } from "../testcase/statements/Statement";
import { ContractFunctionCall } from "../testcase/statements/action/ContractFunctionCall"

type Import = RegularImport | RenamedImport;

type RegularImport = {
  name: string;
  renamed: false;
};

type RenamedImport = {
  name: string;
  renamed: true;
  renamedTo: string;
};

// TODO gather assertions here too per test case
export class ContextBuilder {
  protected static LOGGER: Logger;

  private contractDependencies: Map<string, string[]>;

    // name -> count
    private globalNameCount: Map<string, number>;
    // name -> count
    private testNameCount: Map<string, number>;

  // name -> import
  private imports: Map<string, Import>;

    // Parameter -> variableName
  private statementVariableNameMap: Map<Parameter, string>;

  constructor(contractDependencies: Map<string, string[]>) {
    ContextBuilder.LOGGER = getLogger("ContextBuilder");
    this.contractDependencies = contractDependencies;

    this.globalNameCount = new Map();
    this.testNameCount = new Map();

    this.imports = new Map();    
    this.statementVariableNameMap = new Map();
  }

  nextTestCase() {
    this.statementVariableNameMap = new Map();
    this.testNameCount = new Map();
  }

  getOrCreateVariableName(statement: Statement, parameter: Parameter): string {
    if (this.statementVariableNameMap.has(parameter)) {
      return this.statementVariableNameMap.get(parameter);
    }

    let variableName = "" + parameter.name;

    variableName =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_".includes(
      variableName[0]
    )
      ? variableName[0].toLowerCase() + variableName.slice(1)
      : (ContextBuilder.LOGGER.warn(
          `Found variable name starting with a non-alphabetic character, variable: '${variableName}'`
        ),
        "var" + variableName);

        // TODO reserverd keywords
  // variableName =
  //   reservedKeywords.has(variableName) || globalVariables.has(variableName)
  //     ? "local" + variableName[0].toUpperCase() + variableName.slice(1)
  //     : variableName;

      if (
        statement instanceof ContractFunctionCall
      ) {
        variableName += "ReturnValue";
      }

    
      let count = -1;
      if (
        this.globalNameCount.has(variableName) &&
        this.testNameCount.has(variableName)
      ) {
        count = Math.max(
          this.globalNameCount.get(variableName),
          this.testNameCount.get(variableName)
        );
      } else if (this.globalNameCount.has(variableName)) {
        count = this.globalNameCount.get(variableName);
      } else if (this.testNameCount.has(variableName)) {
        count = this.testNameCount.get(variableName);
      }
  
      if (count === -1) {
        this.testNameCount.set(variableName, 1);
      } else {
        this.testNameCount.set(variableName, count + 1);
        variableName += count;
      }
  
      this.statementVariableNameMap.set(parameter, variableName);
      return variableName;
  }

  getOrCreateImportName(parameter: Parameter): string {
    const import_ = this._addImport(parameter);

    return import_.renamed ? import_.renamedTo : import_.name;
  }

  private _addImport(parameter: Parameter): Import {
    const name = parameter.name
    if (this.imports.has(name)) {
      return this.imports.get(name);
    }

    let import_: Import = {
      name: name,
      renamed: false,
    };

    let count = -1;
    // same name new import
    if (
      this.globalNameCount.has(name) &&
      this.testNameCount.has(name)
    ) {
      count = Math.max(
        this.globalNameCount.get(name),
        this.testNameCount.get(name)
      );
    } else if (this.globalNameCount.has(name)) {
      count = this.globalNameCount.get(name);
    } else if (this.testNameCount.has(name)) {
      count = this.testNameCount.get(name);
    }

    if (count === -1) {
      this.globalNameCount.set(name, 1);
    } else {
      this.globalNameCount.set(name, count + 1);
      this.testNameCount.set(name, count + 1);
      const newName = name + count.toString();

      import_ = {
        name: name,
        renamed: true,
        renamedTo: newName
      };
    }

    this.imports.set(name, import_);
    return import_;
  }

  // TODO we could gather all the imports of a certain path together into one import
  private _getImportString(name: string): string {
    return `const ${name} = artifacts.require("${name}")`;
  }

  private getLinkingStrings(
    contract: string,
    dependency: string,
    count: number
  ): string[] {
    return [
      `const lib${count} = await ${dependency}.new();`,
      `await ${contract}.link('${dependency}', lib${count}.address);`,
    ];
  }

  getImports(assertionsPresent: boolean): { imports: string[], linkings: string[] } {
    let imports: string[] = [];
    const linkings: string[] = [];

    let count = 0;
    for (const import_ of this.imports.values()) {
      // TODO remove unused imports
      const dependencies = this.contractDependencies.get(import_.name);

      for (const dependency of dependencies) {
        linkings.push(
          ...this.getLinkingStrings(import_.name, dependency, count)
        );

        count++;
      }

      imports.push(this._getImportString(import_.name));
    }

    imports = imports
        // remove duplicates
        // there should not be any in theory but lets do it anyway
        .filter((value, index, self) => self.indexOf(value) === index)
        // sort
        .sort()

    if (assertionsPresent) {
      imports.push(
        `const chai = require('chai')`,
        `const chaiAsPromised = require('chai-as-promised')`,
        `const expect = chai.expect;`,
        `chai.use(chaiAsPromised);`
      );
    }

    // TODO other post processing?
    return {
      imports: imports,
      linkings: linkings,
    };
  }
}
