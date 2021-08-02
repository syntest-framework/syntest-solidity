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

  decodeErroringConstructorCall(statement: Statement): string {
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
        `await expect(${
            (statement as ConstructorCall).constructorName
        }.new(${formattedArgs})).to.be.rejectedWith(Error);`
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

  decodeErroringFunctionCall(statement: Statement, objectName: string): string {
    if (statement instanceof ObjectFunctionCall) {
      const args = (statement as ObjectFunctionCall).getChildren();
      const formattedArgs = args.map((a: Statement) => a.varName).join(", ");

      return `await expect(${objectName}.${
          (statement as ObjectFunctionCall).functionName
      }.call(${formattedArgs})).to.be.rejectedWith(Error);`;
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
    )}");`;
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
        const importString: string = this.getImport(dependency);

        // Create link
        linkings.push(`\t\tconst lib${count} = await ${dependency}.new();`);
        linkings.push(
          `\t\tawait ${contract}.link('${dependency}', lib${count}.address);`
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

  generateAssertions(
    ind: TestCase,
    additionalAssertions?: Map<TestCase, { [p: string]: string }>
  ): string[] {
    const assertions: string[] = [];
    if (additionalAssertions && additionalAssertions.has(ind)) {
      const assertion: { [p: string]: string } = additionalAssertions.get(
        ind
      );

      for (const variableName of Object.keys(assertion)) {
        if (variableName === 'error') {
          continue
        }

        if (assertion[variableName] === "[object Object]") continue;

        if (variableName.includes("string")) {
          assertions.push(
            `\t\tassert.equal(${variableName}, "${assertion[variableName]}")`
          );
        } else if (variableName.includes("int")) {
          assertions.push(
            `\t\tassert.equal(${variableName}, BigInt("${assertion[variableName]}"))`
          );
        } else {
          assertions.push(
            `\t\tassert.equal(${variableName}, ${assertion[variableName]})`
          );
        }
      }
    }

    return assertions;
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

    const tests: string[] = [];

    const imports: string[] = [];

    for (const ind of testCase) {
      let stopAfter = -1
      if (additionalAssertions && additionalAssertions.has(ind) && additionalAssertions.get(ind)['error']) {
        stopAfter = Object.keys(additionalAssertions.get(ind)).length
      }


      const testString = [];

      const stack: Statement[] = this.convertToStatementStack(ind);

      if (addLogs) {
        imports.push(`const fs = require('fs');\n\n`);
        testString.push(
          `\t\tawait fs.mkdirSync('${path.join(
            Properties.temp_log_directory,
            ind.id
          )}', { recursive: true })\n`
        );
        testString.push('try {')
      }

      const importableGenes: ConstructorCall[] = [];

      const constructor = ind.root;
      stack.push(constructor);

      let primitiveStatements: string[] = []
      const functionCalls: string[] = []
      const assertions: string[] = []

      let count = 1
      while (stack.length) {
        const gene: Statement = stack.pop()!;

        if (gene instanceof ConstructorCall) {
          if (count === stopAfter) {
            assertions.push(`\t\t${this.decodeErroringConstructorCall(gene)}`)
            break
          }
          testString.push(`\t\t${this.decodeConstructor(gene)}`);
          importableGenes.push(<ConstructorCall>gene);
          count += 1
        } else if (gene instanceof PrimitiveStatement) {
          primitiveStatements.push(`\t\t${this.decodeStatement(gene)}`);
        } else if (gene instanceof ObjectFunctionCall) {
          if (count === stopAfter) {
            assertions.push(`\t\t${this.decodeErroringFunctionCall(gene, constructor.varName)}`)
            break
          }
          functionCalls.push(
            `\t\t${this.decodeFunctionCall(gene, constructor.varName)}`
          );
          count += 1
        } else {
          throw Error(`The type of gene ${gene} is not recognized`);
        }

        if (addLogs) {
          if (gene instanceof ObjectFunctionCall) {
            functionCalls.push(
                `\t\tawait fs.writeFileSync('${path.join(
                    Properties.temp_log_directory,
                    ind.id,
                    gene.varName
                )}', '' + ${gene.varName})`
            );
          } else if (gene instanceof ConstructorCall) {
            testString.push(
                `\t\tawait fs.writeFileSync('${path.join(
                    Properties.temp_log_directory,
                    ind.id,
                    gene.varName
                )}', '' + ${gene.varName})`
            );
          }
        }
      }

      // filter non-required statements
      primitiveStatements = primitiveStatements.filter((s) => {
        const varName = s.split(' ')[1]
        return functionCalls.find((f) => f.includes(varName))
      })

      testString.push(...primitiveStatements)
      testString.push(...functionCalls)

      if (addLogs) {
        testString.push(`} catch (e) {`)
        testString.push(`await fs.writeFileSync('${path.join(
            Properties.temp_log_directory,
            ind.id,
            'error'
        )}', '' + e.stack)`)
        testString.push('}')
      }

      const [importsOfTest, linkings] = this.gatherImports(importableGenes);
      imports.push(...importsOfTest);

      if (additionalAssertions) {
        imports.push(`const chai = require('chai');`)
        imports.push(`const expect = chai.expect;`)
        imports.push(`chai.use(require('chai-as-promised'));`)
      }

      assertions.unshift(...this.generateAssertions(ind, additionalAssertions));

      const body = [];
      if (linkings.length) {
        body.push(`${linkings.join("\n")}`);
      }
      if (testString.length) {
        body.push(`${testString.join("\n")}`);
      }
      if (assertions.length) {
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
