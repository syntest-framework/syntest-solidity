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
import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { ContextBuilder } from "./ContextBuilder";
import { ActionStatement } from "../testcase/statements/action/ActionStatement";
import { Decoding } from "./Decoding";

/**
 * Solidity Decoder
 */
export class SolidityDecoder implements Decoder<SolidityTestCase, string> {
  private tempLogDirectory: string;
  private contractDependencies: Map<string, string[]>;

  constructor(temporaryLogDirectory: string, contractDependencies: Map<string, string[]>) {
    this.tempLogDirectory = temporaryLogDirectory;
    this.contractDependencies = contractDependencies
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
    testCases: SolidityTestCase | SolidityTestCase[],
    targetName: string,
    addLogs = false
  ): string {
    if (testCases instanceof SolidityTestCase) {
      testCases = [testCases];
    }

    const context = new ContextBuilder(this.contractDependencies)

    const tests: string[] = [];

    for (const testCase of testCases) {
      const roots: ActionStatement[] = testCase.roots;

      let decodings: Decoding[] = roots.flatMap((root) =>
        root.decode(context, false)
      );

      if (decodings.length === 0) {
        throw new Error("No statements in test case");
      }
      
      const testString = [];

      if (addLogs) {
        testString.push(
          `\t\tawait fs.mkdirSync('${path.join(
            this.tempLogDirectory,
            testCase.id
          )}', { recursive: true })\n
          \t\tlet count = 0;
          \t\ttry {\n`
        );
      }

      if (testCase.assertions.size > 0 && testCase.assertions.has("error")) {
        const index = Number.parseInt(testCase.assertions.get("error"));

        // TODO does not work
        //  the .to.throw stuff does not work somehow
        // const decoded = statements[index].reference instanceof MethodCall
        //   ? (<MethodCall>statements[index].reference).decodeWithObject(testCase.id, { addLogs, exception: true }, statements[index].objectVariable)
        //   : statements[index].reference.decode(testCase.id, { addLogs, exception: true })
        // statements[index] = decoded.find((x) => x.reference === statements[index].reference)

        // delete statements after
        decodings = decodings.slice(0, index + 1);
      }

      if (decodings.length === 0) {
        throw new Error("No statements in test case after error reduction");
      }

      for (const [index, value] of decodings.entries()) {
        context.addDecoding(value);
        const asString = "\t\t" + value.decoded.replace("\n", "\n\t\t");
        if (testString.includes(asString)) {
          // skip repeated statements
          continue;
        }

        if (addLogs) {
          // add log per statement
          testString.push("\t\t" + `count = ${index};`);
        }

        testString.push(asString);
      }

      if (addLogs) {
        testString.push(
          `} catch (e) {`,
          `await fs.writeFileSync('${path.join(
            this.tempLogDirectory,
            testCase.id,
            "error"
          )}', '' + count)`, // TODO we could add the error here and assert that that is the error message we expect
          "}"
        );
      }

      if (addLogs) {
        context.addLogs();
      }

      if (testCase.assertions.size > 0) {
        context.addAssertions();
      }

      const assertions: string[] = this.generateAssertions(testCase);

      if (assertions.length > 0) {
        assertions.splice(0, 0, "\n\t\t// Assertions");
      }

      const body = [];

      if (testString.length > 0) {
        let errorStatement: string;
        if (testCase.assertions.size > 0 && testCase.assertions.has("error")) {
          errorStatement = testString.pop();
        }

        body.push(`${testString.join("\n")}`, `${assertions.join("\n")}`);

        if (errorStatement) {
          body.push(
            `\t\ttry {\n\t${errorStatement}\n\t\t} catch (e) {\n\t\t\texpect(e).to.be.an('error')\n\t\t}`
          );
        }
      }

      const metaCommentBlock = [];

      for (const metaComment of testCase.metaComments) {
        metaCommentBlock.push(`\t\t// ${metaComment}`);
      }

      if (metaCommentBlock.length > 0) {
        metaCommentBlock.splice(0, 0, "\n\t\t// Meta information");
      }

      // TODO instead of using the targetName use the function call or a better description of the test
      tests.push(
        `${metaCommentBlock.join("\n")}\n` +
          `\n\t\t// Test\n` +
          `${body.join("\n\n")}`
      );
      
    }

    const [imports, linkings] = context.getImports();
    const importsString = imports.join("\n") + `\n\n`;
    const linkingsString = '\t\t' + linkings.join("\n\t\t") + '\n\n'

    return `// Imports\n` +
    importsString +
    `contract('${targetName}', function(accounts) {\n\t` +
    tests
      .map(
        (test) =>
          `\tit('test for ${targetName}', async () => {\n` +
          '\t\t// Linkings\n' +
          linkingsString +  
          test +
          `\n\t});`
      )
      .join("\n\n") +
    `\n})`
  }
}
