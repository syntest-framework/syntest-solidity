import {
  ConstructorCall,
  Properties,
  ObjectFunctionCall,
  PrimitiveStatement,
  Statement,
  StringStatement,
  TestCaseDecoder,
  TestCase,
} from "syntest-framework";
import * as path from "path";
import * as web3_utils from "web3-utils";
import { ByteStatement } from "../testcase/statements/ByteStatement";
import { AddressStatement } from "../testcase/statements/AddressStatement";

/**
 * @author Dimitri Stallenberg
 * @author Mitchell Olsthoorn
 */
export class SolidityTruffleStringifier implements TestCaseDecoder {
  private imports: Map<string, string>;
  private contractDependencies: Map<string, string[]>;

  constructor(
    imports: Map<string, string>,
    contractDependencies: Map<string, string[]>
  ) {
    this.imports = imports;
    this.contractDependencies = contractDependencies;
  }

  decodeConstructor(statement: Statement): string {
    if (!(statement instanceof ConstructorCall))
      throw new Error(`${statement} is not a constructor`);

    let string = "";

    const args = (statement as ConstructorCall).args;
    for (const arg of args) {
      if (arg instanceof PrimitiveStatement) {
        string = string + this.decodeStatement(arg) + "\n\t\t";
      }
    }
    const formattedArgs = args
      .map((a: PrimitiveStatement<any>) => a.varName)
      .join(", ");

    return (
      string +
      `const ${statement.varName} = await ${
        (statement as ConstructorCall).constructorName
      }.new(${formattedArgs});`
    );
  }

  decodeStatement(statement: Statement): string {
    if (!(statement instanceof PrimitiveStatement)) {
      throw new Error(`${statement} is not a primitive statement`);
    }

    const primitive: PrimitiveStatement<any> = statement as PrimitiveStatement<any>;
    if (statement.type.startsWith("int") || statement.type.startsWith("uint")) {
      const value = primitive.value.toFixed();
      return `const ${statement.varName} = BigInt("${value}")`;
    } else if (statement instanceof StringStatement) {
      return `const ${statement.varName} = "${primitive.value}"`;
    } else if (statement instanceof AddressStatement) {
      if (statement.account < 0) {
        const address = "0x".concat(
          (-statement.account).toString(16).padStart(40, "0")
        );
        return `const ${statement.varName} = "${address}"`;
      } else {
        return `const ${statement.varName} = ${primitive.value}`;
      }
    } else if (statement instanceof ByteStatement) {
      const bytes = web3_utils.bytesToHex((statement as ByteStatement).value);
      return `const ${statement.varName} = "${bytes}"`;
    } else {
      return `const ${statement.varName} = ${primitive.value}`;
    }
  }

  decodeFunctionCall(statement: Statement, objectName: string): string {
    if (statement instanceof ObjectFunctionCall) {
      const args = (statement as ObjectFunctionCall).getChildren();
      const formattedArgs = args.map((a: Statement) => a.varName).join(", ");

      if (
        statement.type !== "none" &&
        statement.type !== "" &&
        !statement.varName.includes(",")
      ) {
        return `const ${statement.varName} = await ${objectName}.${
          (statement as ObjectFunctionCall).functionName
        }.call(${formattedArgs});`;
      }
      return `await ${objectName}.${
        (statement as ObjectFunctionCall).functionName
      }.call(${formattedArgs});`;
    } else {
      throw new Error(`${statement} is not a function call`);
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
    )}");
    `;
  }

  convertToStatementStack(ind: TestCase): Statement[] {
    const stack: Statement[] = [];
    const queue: Statement[] = [ind.root];
    while (queue.length) {
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
    return stack
  }

  gatherImports(importableGenes: ConstructorCall[]): [string[], string[]] {
    const imports: string[] = [];
    const linkings: string[] = []
    for (const gene of importableGenes) {
      const contract = gene.constructorName;

      const importString: string = this.getImport(contract);

      if (imports.includes(importString) || importString.length === 0) {
        continue;
      }

      imports.push(importString);

      let count = 0;
      for (const dependency of this.contractDependencies.get(contract)) {
        const importString: string = this.getImport(dependency);

        // Create link
        linkings.push(`\t\tconst lib${count} = await ${dependency}.new();`)
        linkings.push(`\t\tawait ${contract}.link('${dependency}', lib${count}.address);\n`)

        if (imports.includes(importString) || importString.length === 0) {
          continue;
        }

        imports.push(importString);

        count += 1;
      }
    }

    return [imports, linkings]
  }

  generateAssertions(
      ind: TestCase,
      additionalAssertions?: Map<TestCase, { [p: string]: string }>
  ): string[] {
    const assertions: string[] = []
    if (additionalAssertions) {
      if (additionalAssertions.has(ind)) {
        const assertion: { [p: string]: string } = additionalAssertions.get(ind);
        for (const variableName of Object.keys(assertion)) {
          if (assertion[variableName] === "[object Object]") continue;

          if (variableName.includes("string")) {
            assertions.push(`\t\tassert.equal(${variableName}, "${assertion[variableName]}")`);
          } else if (variableName.includes("int")) {
            assertions.push(`\t\tassert.equal(${variableName}, BigInt("${assertion[variableName]}"))`);
          } else {
            assertions.push(`\t\tassert.equal(${variableName}, ${assertion[variableName]})`);
          }
        }
      }
    }

    return assertions
  }

  decodeTestCase(
    testCase: TestCase | TestCase[],
    targetName: string,
    addLogs?: boolean,
    additionalAssertions?: Map<TestCase, { [p: string]: string }>
  ): string {
    if (testCase instanceof TestCase) {
      testCase = [testCase];
    }

    let totalTestString = "";

    const imports: string[] = [];

    for (const ind of testCase) {
      const testString = [];

      const stack: Statement[] = this.convertToStatementStack(ind)

      if (addLogs) {
        imports.push(`const fs = require('fs');\n\n`)
        testString.push(`\t\tawait fs.mkdirSync('${path.join(
          Properties.temp_log_directory,
          ind.id
        )}', { recursive: true })\n`);
      }

      const importableGenes: ConstructorCall[] = [];

      const constructor = ind.root;
      stack.push(constructor);

      while (stack.length) {
        const gene: Statement = stack.pop()!;

        if (gene instanceof ConstructorCall) {
          testString.push(`\t\t${this.decodeConstructor(gene)}`);
          importableGenes.push(<ConstructorCall>gene);
        } else if (gene instanceof PrimitiveStatement) {
          testString.push(`\t\t${this.decodeStatement(gene)}`);
        } else if (gene instanceof ObjectFunctionCall) {
          testString.push(`\t\t${this.decodeFunctionCall(gene, constructor.varName)}`);
        } else {
          throw Error(`The type of gene ${gene} is not recognized`);
        }

        if (addLogs && gene instanceof ObjectFunctionCall) {
          testString.push(`\t\tawait fs.writeFileSync('${path.join(
              Properties.temp_log_directory,
              ind.id,
              gene.varName
          )}', '' + ${gene.varName})`);
        }
      }

      const [importsOfTest, linkings] = this.gatherImports(importableGenes)
      imports.push(...importsOfTest)

      const assertions = this.generateAssertions(ind, additionalAssertions)

      // TODO instead of using the targetName use the function call or a better description of the test
      totalTestString +=
        `\tit('test for ${targetName}', async () => {\n` +
        `${linkings.join("\n")}` +
        `${testString.join("\n")}` +
        `${assertions.join("\n")}` +
        `\t});\n`;
    }

    let test =
      `contract('${targetName}', (accounts) => {\n` + totalTestString + `\n})`;

    // Add the imports
    test = imports.join("\n") + `\n` + test;

    return test;
  }
}
