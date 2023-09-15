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
import { Decoding } from "./Decoding";
import { ConstructorCall } from "../testcase/statements/action/ConstructorCall";

type Import = {
  name: string;
  renamed: boolean;
  renamedTo?: string;
};

// TODO we can also use this to generate unique identifier for the statements itself
// TODO gather assertions here too per test case
export class ContextBuilder {
  private contractDependencies: Map<string, string[]>;

  // name -> import
  private imports: Map<string, Import>;

  private logsPresent: boolean;
  private assertionsPresent: boolean;

  // old var -> new var
  private variableMap: Map<string, string>;
  // var -> count
  private variableCount: Map<string, number>;


  private statementVariableNameMap: Map<Parameter, string>
  private variableNameCount: Map<string, number>

  constructor(contractDependencies: Map<string, string[]>) {
    this.contractDependencies = contractDependencies

    this.imports = new Map();

    this.logsPresent = false;
    this.assertionsPresent = false;

    this.variableMap = new Map();
    this.variableCount = new Map();

    this.statementVariableNameMap = new Map()
    this.variableNameCount = new Map()
  }

  getOrCreateVariableName(parameter: Parameter): string {
    // to camelcase

    if (this.statementVariableNameMap.has(parameter)) {
      return this.statementVariableNameMap.get(parameter)
    }

    let variableName = ''

    if (this.variableNameCount.has(variableName)) {
        const count = this.variableNameCount.get(variableName)
        this.variableNameCount.set(variableName, count + 1)
        variableName += count
    } else {
        this.variableNameCount.set(variableName, 1)
    }

    this.statementVariableNameMap.set(parameter, variableName)
    return variableName
  }

  addDecoding(decoding: Decoding) {
    // This function assumes the decodings to come in order

    if (decoding.reference instanceof ConstructorCall) {
      const import_ = this._addImport(decoding.reference.type.name);
      const newName = import_.renamed ? import_.renamedTo : import_.name;
      decoding.decoded = decoding.decoded.replaceAll(import_.name, newName);
    }

    const variableName = this.getOrCreateVariableName(decoding.reference.type);
    if (this.variableMap.has(variableName)) {
      this.variableCount.set(
        variableName,
        this.variableCount.get(variableName) + 1
      );
    } else {
      this.variableCount.set(variableName, 0);
    }

    this.variableMap.set(
      variableName,
      variableName + this.variableCount.get(variableName)
    );

    for (const [oldVariable, newVariable] of this.variableMap.entries()) {
      decoding.decoded = decoding.decoded.replaceAll(oldVariable, newVariable);
    }
  }

  addLogs() {
    this.logsPresent = true;
  }

  addAssertions() {
    this.assertionsPresent = true;
  }

  private _addImport(name: string): Import {
    const import_: Import = {
      name: name,
      renamed: false,
    };

    if (this.imports.has(name)) {
      return this.imports.get(name);
    }

    this.imports.set(name, import_)
    return import_;
  }

  // TODO we could gather all the imports of a certain path together into one import
  private _getImportString(name: string): string {
    return `const ${name} = artifacts.require("${name}")`
  }

  private getLinkingStrings(contract: string, dependency: string, count: number): string[] {
    return [
      `const lib${count} = await ${dependency}.new();`,
      `await ${contract}.link('${dependency}', lib${count}.address);`
    ]
  }

  getImports(): [string[], string[]] {
    const imports: string[] = [];
    const linkings: string[] = []

    let count = 0
    for (const import_ of this.imports.values()) {
      // TODO remove unused imports
        const dependencies = this.contractDependencies.get(import_.name)
        
        for (const dependency of dependencies) {
          linkings.push(...this.getLinkingStrings(import_.name, dependency, count))

          count++;
        }

        imports.push(this._getImportString(import_.name));
    }

    if (this.assertionsPresent) {
      imports.push(
        `const chai = require('chai')`,
        `const chaiAsPromised = require('chai-as-promised')`,
        `const expect = chai.expect;`,
        `chai.use(chaiAsPromised);`
      );
    }

    if (this.logsPresent) {
      imports.push(`import * as fs from 'fs'`);
    }
    // TODO other post processing?
    return [(
      imports
        // remove duplicates
        // there should not be any in theory but lets do it anyway
        .filter((value, index, self) => self.indexOf(value) === index)
        // sort
        .sort()
    ), (
      linkings
    )];
  }
}
