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

import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { ContextBuilder } from "./ContextBuilder";
import { ActionStatement } from "../testcase/statements/action/ActionStatement";
import { Decoding } from "./Decoding";
import { ContractFunctionCall } from "../testcase/statements/action/ContractFunctionCall";

/**
 * Solidity Decoder
 */
export class SolidityDecoder implements Decoder<SolidityTestCase, string> {
  private contractDependencies: Map<string, string[]>;

  constructor(contractDependencies: Map<string, string[]>) {
    this.contractDependencies = contractDependencies;
  }

  decode(
    testCases: SolidityTestCase | SolidityTestCase[],
    gatherAssertionData = false
  ): string {
    if (testCases instanceof SolidityTestCase) {
      testCases = [testCases];
    }

    const context = new ContextBuilder(this.contractDependencies);

    const tests: string[][] = [];

    let assertionsPresent = false;
    for (const testCase of testCases) {
      if (testCase.assertionData) {
        assertionsPresent = true;
      }
      context.nextTestCase();
      const roots: ActionStatement[] = testCase.roots;

      let decodings: Decoding[] = roots.flatMap((root) => root.decode(context));

      if (decodings.length === 0) {
        throw new Error("No statements in test case");
      }

      let errorDecoding: Decoding;
      if (testCase.assertionData && testCase.assertionData.error) {
        const index = testCase.assertionData.error.count;

        // delete statements after
        errorDecoding = decodings[index];
        decodings = decodings.slice(0, index);
      }

      if (decodings.length === 0) {
        throw new Error("No statements in test case after error reduction");
      }

      const metaCommentBlock = this.generateMetaComments(testCase);

      const testLines: string[] = this.generateTestLines(
        context,
        testCase,
        decodings,
        gatherAssertionData
      );

      const assertions: string[] = this.generateAssertions(
        testCase,
        errorDecoding
      );

      tests.push([...metaCommentBlock, ...testLines, ...assertions]);
    }

    const { imports, linkings } = context.getImports(assertionsPresent);

    const lines = [
      "// Imports",
      ...imports,
      // gatherAssertionData ? assertionFunction : "",
      `contract('SynTest Test Suite', function(accounts) {`,
      ...tests.flatMap((testLines: string[], index) => [
        `\tit("Test ${index + 1}", async () => {`,
        `\t\t// Linkings`,
        ...linkings.map((line) => `\t\t${line}`),
        ...testLines.map((line) => `\t\t${line}`),
        index === tests.length - 1 ? "\t})" : "\t})\n",
      ]),
      "})",
    ];

    return lines.join("\n");
  }

  generateMetaComments(testCase: SolidityTestCase) {
    const metaCommentBlock = [];
    for (const metaComment of testCase.metaComments) {
      metaCommentBlock.push(`// ${metaComment}`);
    }

    if (metaCommentBlock.length > 0) {
      metaCommentBlock.splice(0, 0, "// Meta information");
      metaCommentBlock.push("");
    }

    return metaCommentBlock;
  }

  generateTestLines(
    context: ContextBuilder,
    testCase: SolidityTestCase,
    decodings: Decoding[],
    gatherAssertionData: boolean
  ) {
    const testLines: string[] = [];
    if (gatherAssertionData) {
      testLines.push("let count = 0;", "try {");
    }

    for (const [index, value] of decodings.entries()) {
      const asString = value.decoded;
      if (testLines.includes(asString)) {
        // skip repeated statements
        continue;
      }

      testLines.push(asString);

      if (gatherAssertionData) {
        // add log per statement
        testLines.push(`count = ${index + 1};`);

        if (value.reference instanceof ContractFunctionCall) {
          for (const parameter of value.reference.type.type.returns) {
            const variableName = context.getOrCreateVariableName(
              value.reference,
              parameter
            );

            testLines.push(
              `addAssertion('${testCase.id}', '${variableName}', ${variableName})`
            );
          }
        }
      }
    }

    if (gatherAssertionData) {
      testLines.push(
        `} catch (e) {`,
        `\tsetError('${testCase.id}', e, count)`,
        "}"
      );
    }

    if (testLines.length > 0) {
      testLines.splice(0, 0, "// Test");
      testLines.push("");
    }

    return testLines;
  }

  generateAssertions(
    testCase: SolidityTestCase,
    errorDecoding: Decoding
  ): string[] {
    const assertions: string[] = [];
    if (testCase.assertionData) {
      for (const [variableName, assertion] of Object.entries(
        testCase.assertionData.assertions
      )) {
        const original = assertion.value;
        let stringified = assertion.stringified;
        if (original === "undefined") {
          assertions.push(`assert.equal(${variableName}, ${original})`);
          continue;
        }

        // TODO dirty hack because json.parse does not allow undefined/NaN
        // TODO undefined/NaN can happen in arrays
        stringified = stringified.replace("undefined", "null");
        stringified = stringified.replace("NaN", "null");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = JSON.parse(stringified);

        if (variableName.includes("int")) {
          assertions.push(
            `assert.equal(${variableName}, BigInt${stringified}));`
          );
        } else if (variableName.includes("fixed")) {
          assertions.push(
            `assert.equal(${variableName}, BigNumber(${stringified}));`
          );
        } else if (variableName.includes("string")) {
          assertions.push(`assert.equal(${variableName}, "${stringified}");`);
        } else if (typeof value === "object" || typeof value === "function") {
          assertions.push(
            `expect(JSON.parse(JSON.stringify(${variableName}))).to.deep.equal(${stringified})`
          );
        } else {
          assertions.push(`expect(${variableName}).to.equal(${stringified})`);
        }
      }
    }

    if (errorDecoding) {
      let value = testCase.assertionData.error.error.message;

      value = value.replaceAll(/\\/g, "\\\\");
      value = value.replaceAll(/\n/g, "\\n");
      value = value.replaceAll(/\r/g, "\\r");
      value = value.replaceAll(/\t/g, "\\t");
      value = value.replaceAll(/"/g, '\\"');

      assertions.push(
        `await expect((async () => {`,
        `\t${errorDecoding.decoded.split(" = ")[1]}`,
        `})()).to.be.rejectedWith("${value}")`
      );
    }

    if (assertions.length > 0) {
      assertions.splice(0, 0, "// Assertions");
    }

    return assertions;
  }
}
