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

import { Decoder } from "@syntest/search";

import * as path from "node:path";
import * as web3_utils from "web3-utils";
import { ArrayStatement } from "../testcase/statements/complex/ArrayStatement";
import { AddressStatement } from "../testcase/statements/primitive/AddressStatement";
import { ConstructorCall } from "../testcase/statements/action/ConstructorCall";
import { StringStatement } from "../testcase/statements/primitive/StringStatement";
import { ObjectFunctionCall } from "../testcase/statements/action/ObjectFunctionCall";
import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { Statement } from "../testcase/statements/Statement";
import { PrimitiveStatement } from "../testcase/statements/primitive/PrimitiveStatement";

/**
 * Solidity Decoder
 */
export class SolidityDecoder implements Decoder<SolidityTestCase, string> {
  private targetRootDirectory: string;
  private tempLogDirectory: string;

  constructor(targetRootDirectory: string, temporaryLogDirectory: string) {
    this.targetRootDirectory = targetRootDirectory;
    this.tempLogDirectory = temporaryLogDirectory;
  }

  decodeConstructor(statement: Statement): string {
    if (!(statement instanceof ConstructorCall))
      throw new Error(`${statement} is not a constructor`);

    let string = "";

    const arguments_ = (statement as ConstructorCall).arguments_;
    for (const argument of arguments_) {
      if (argument instanceof PrimitiveStatement) {
        string = string + this.decodeStatement(argument) + "\n\t\t";
      }
    }
    const formattedArguments = arguments_
      .map((a: PrimitiveStatement<any, any>) => a.varName)
      .join(", ");

    const sender = (statement as ConstructorCall).getSender().getValue();
    const senderString =
      formattedArguments == "" ? `{from: ${sender}}` : `, {from: ${sender}}`;
    return (
      string +
      `const ${statement.varNames[0]} = await ${
        (statement as ConstructorCall).constructorName
      }.new(${formattedArguments}${senderString});`
    );
  }

  decodeErroringConstructorCall(statement: Statement): string {
    if (!(statement instanceof ConstructorCall))
      throw new Error(`${statement} is not a constructor`);

    let string = "";

    const arguments_ = (statement as ConstructorCall).arguments_;
    for (const argument of arguments_) {
      if (argument instanceof PrimitiveStatement) {
        string = string + this.decodeStatement(argument) + "\n\t\t";
      }
    }
    const formattedArguments = arguments_
      .map((a: PrimitiveStatement<any>) => a.varName)
      .join(", ");

    const sender = (statement as ConstructorCall).getSender().getValue();
    const senderString =
      formattedArguments == "" ? `{from: ${sender}}` : `, {from: ${sender}}`;

    return (
      string +
      `await expect(${
        (statement as ConstructorCall).constructorName
      }.new(${formattedArguments}${senderString}).to.be.rejectedWith(Error);`
    );
  }

  decodeStatement(statement: Statement): string {
    if (!(statement instanceof PrimitiveStatement)) {
      throw new TypeError(`${statement} is not a primitive statement`);
    }

    const primitive: PrimitiveStatement<any, any> =
      statement as PrimitiveStatement<any, any>;
    // TODO what happened to float support?
    if (
      statement.type.type.startsWith("int") ||
      statement.type.type.startsWith("uint")
    ) {
      const value = primitive.value.toFixed(0);
      return `const ${statement.varName} = BigInt("${value}")`;
    } else if (statement instanceof StringStatement) {
      return `const ${statement.varName} = "${primitive.value}"`;
    } else if (statement instanceof AddressStatement) {
      return (statement as AddressStatement).toCode();
    } else if (statement instanceof ArrayStatement) {
      const bytes = web3_utils.bytesToHex((statement as ArrayStatement).value);
      return `const ${statement.varName} = "${bytes}"`;
    } else {
      return `const ${statement.varName} = ${primitive.value}`;
    }
  }

  decodeFunctionCall(statement: Statement, objectName: string): string {
    if (statement instanceof ObjectFunctionCall) {
      const arguments_ = (statement as ObjectFunctionCall).getChildren();
      // TODO the difficulty now is to select the correct var from the statements....
      // TODO now assuming its always the first one
      const formattedArguments = arguments_
        .map((a: Statement) => a.varNames[0])
        .join(", ");

      // TODO not sure how the multi args are returned to javascript (since javascript does not support this syntax
      // TODO assuming it gets wrapped into an array

      const sender = (statement as ObjectFunctionCall).getSender().getValue();
      const senderString =
        formattedArguments == "" ? `{from: ${sender}}` : `, {from: ${sender}}`;

      if (
        statement.types.length > 0 &&
        !(
          statement.types.length === 1 &&
          ["void", "none"].includes(statement.types[0].type)
        )
      ) {
        let variableNames = statement.varNames[0];
        if (statement.types.length > 1) {
          variableNames = `[${statement.varNames.join(", ")}]`;
        }
        return `const ${variableNames} = await ${objectName}.${
          (statement as ObjectFunctionCall).functionName
        }.call(${formattedArguments}${senderString});`;
      }
      return `await ${objectName}.${
        (statement as ObjectFunctionCall).functionName
      }.call(${formattedArguments}${senderString});`;
    } else {
      throw new TypeError(`${statement} is not a function call`);
    }
  }

  decodeErroringFunctionCall(statement: Statement, objectName: string): string {
    if (statement instanceof ObjectFunctionCall) {
      const arguments_ = (statement as ObjectFunctionCall).getChildren();
      // TODO the difficulty now is to select the correct var from the statements....
      // TODO now assuming its always the first one
      const formattedArguments = arguments_
        .map((a: Statement) => a.varNames[0])
        .join(", ");

      const sender = (statement as ObjectFunctionCall).getSender().getValue();
      const senderString =
        formattedArguments == "" ? `{from: ${sender}}` : `, {from: ${sender}}`;

      return `await expect(${objectName}.${
        (statement as ObjectFunctionCall).functionName
      }.call(${formattedArguments}${senderString})).to.be.rejectedWith(Error);`;
    } else {
      throw new TypeError(`${statement} is not a function call`);
    }
  }

  getImport(constructorName: string): string {
    if (!this.imports.has(constructorName)) {
      throw new Error(
        `Cannot find the import, constructor: ${constructorName} belongs to`
      );
    }

    return `const ${constructorName} = artifacts.require("${this.imports.get(
      constructorName
    )}");`;
  }

  convertToStatementStack(ind: SolidityTestCase): Statement[] {
    const stack: Statement[] = [];
    const queue: Statement[] = [ind.root];
    while (queue.length > 0) {
      const current: Statement = queue.splice(0, 1)[0];

      if (current instanceof ConstructorCall) {
        for (const call of current.getMethodCalls()) {
          queue.push(call);
        }
      } else {
        stack.push(current);

        for (const child of current.getChildren()) {
          queue.push(child);
        }
      }
    }
    return stack;
  }

  gatherImports(importableGenes: ConstructorCall[]): [string[], string[]] {
    const imports: string[] = [];
    const linkings: string[] = [];
    for (const gene of importableGenes) {
      const contract = gene.constructorName;

      const importString: string = this.getImport(contract);

      if (imports.includes(importString) || importString.length === 0) {
        continue;
      }

      imports.push(importString);

      let count = 0;
      for (const dependency of this.contractDependencies.get(contract)) {
        const importString: string = this.getImport(dependency.targetName);

        // Create link
        linkings.push(
          `\t\tconst lib${count} = await ${dependency.targetName}.new();`,
          `\t\tawait ${contract}.link('${dependency.targetName}', lib${count}.address);`
        );

        if (imports.includes(importString) || importString.length === 0) {
          continue;
        }

        imports.push(importString);

        count += 1;
      }
    }

    return [imports, linkings];
  }

  generateAssertions(ind: SolidityTestCase): string[] {
    const assertions: string[] = [];
    if (ind.assertions.size > 0) {
      for (const variableName of ind.assertions.keys()) {
        if (variableName === "error") {
          continue;
        }

        if (ind.assertions.get(variableName) === "[object Object]") continue;

        if (variableName.includes("string")) {
          assertions.push(
            `\t\tassert.equal(${variableName}, "${ind.assertions.get(
              variableName
            )}")`
          );
        } else if (variableName.includes("int")) {
          assertions.push(
            `\t\tassert.equal(${variableName}, BigInt("${ind.assertions.get(
              variableName
            )}"))`
          );
        } else {
          assertions.push(
            `\t\tassert.equal(${variableName}, ${ind.assertions.get(
              variableName
            )})`
          );
        }
      }
    }

    return assertions;
  }

  decode(
    testCase: SolidityTestCase | SolidityTestCase[],
    targetName: string,
    addLogs = false,
    sourceDirectory = "../instrumented"
  ): string {
    if (testCase instanceof SolidityTestCase) {
      testCase = [testCase];
    }

    const tests: string[] = [];

    const imports: string[] = [];

    for (const ind of testCase) {
      // The stopAfter variable makes sure that when one of the function calls has thrown an exception the test case ends there.
      let stopAfter = -1;
      if (ind.assertions.size > 0 && ind.assertions.has("error")) {
        stopAfter = ind.assertions.size;
      }

      const testString = [];
      const stack: Statement[] = this.convertToStatementStack(ind);

      if (addLogs) {
        imports.push(`const fs = require('fs');\n\n`);
        testString.push(
          `\t\tawait fs.mkdirSync('${path.join(
            CONFIG.tempLogDirectory,
            ind.id
          )}', { recursive: true })\n`,
          "try {"
        );
      }

      const importableGenes: ConstructorCall[] = [];

      const constructor = ind.root;
      stack.push(constructor);

      let primitiveStatements: string[] = [];
      const functionCalls: string[] = [];
      const assertions: string[] = [];

      let count = 1;
      while (stack.length > 0) {
        const gene: Statement = stack.pop();

        if (gene instanceof ConstructorCall) {
          if (
            count === stopAfter && // assertions.push(`\t\t${this.decodeErroringConstructorCall(gene)}`);
            CONFIG.testMinimization
          )
            break;
          testString.push(`\t\t${this.decodeConstructor(gene)}`);
          importableGenes.push(<ConstructorCall>gene);
          count += 1;
        } else if (gene instanceof PrimitiveStatement) {
          primitiveStatements.push(`\t\t${this.decodeStatement(gene)}`);
        } else if (gene instanceof ObjectFunctionCall) {
          if (count === stopAfter) {
            assertions.push(
              `\t\t${this.decodeErroringFunctionCall(
                gene,
                constructor.varNames[0]
              )}`
            );
            if (CONFIG.testMinimization) break;
          }
          functionCalls.push(
            `\t\t${this.decodeFunctionCall(gene, constructor.varNames[0])}`
          );
          count += 1;
        } else {
          throw new TypeError(`The type of gene ${gene} is not recognized`);
        }

        if (addLogs) {
          if (gene instanceof ObjectFunctionCall) {
            for (const variableName of gene.varNames) {
              functionCalls.push(
                `\t\tawait fs.writeFileSync('${path.join(
                  this.tempLogDirectory,
                  ind.id,
                  variableName
                )}', '' + ${variableName})`
              );
            }
          } else if (gene instanceof ConstructorCall) {
            for (const variableName of gene.varNames) {
              testString.push(
                `\t\tawait fs.writeFileSync('${path.join(
                  this.tempLogDirectory,
                  ind.id,
                  variableName
                )}', '' + ${variableName})`
              );
            }
          }
        }
      }

      // filter non-required statements
      primitiveStatements = primitiveStatements.filter((s) => {
        const variableName = s.split(" ")[1];
        return (
          functionCalls.find((f) => f.includes(variableName)) ||
          assertions.find((f) => f.includes(variableName))
        );
      });

      testString.push(...primitiveStatements, ...functionCalls);

      if (addLogs) {
        testString.push(`} catch (e) {`, 
          `await fs.writeFileSync('${path.join(
            this.tempLogDirectory,
            ind.id,
            "error"
          )}', '' + e.stack)`,
          "}"
        );
      }

      const [importsOfTest, linkings] = this.gatherImports(importableGenes);
      imports.push(...importsOfTest);

      if (ind.assertions.size > 0) {
        imports.push(
          `const chai = require('chai');`,
          `const expect = chai.expect;`,
          `chai.use(require('chai-as-promised'));`
        );
      }

      assertions.unshift(...this.generateAssertions(ind));

      const body = [];
      if (linkings.length > 0) {
        body.push(`${linkings.join("\n")}`);
      }
      if (testString.length > 0) {
        body.push(`${testString.join("\n")}`);
      }
      if (assertions.length > 0) {
        body.push(`${assertions.join("\n")}`);
      }

      // TODO instead of using the targetName use the function call or a better description of the test
      tests.push(
        `\tit('test for ${targetName}', async () => {\n` +
          `${body.join("\n\n")}` +
          `\n\t});`
      );
    }

    let test =
      `contract('${targetName}', (accounts) => {\n` +
      tests.join("\n\n") +
      `\n})`;

    // Add the imports
    test =
      imports
        .filter((value, index, self) => self.indexOf(value) === index)
        .join("\n") +
      `\n\n` +
      test;

    return test;
  }
}
