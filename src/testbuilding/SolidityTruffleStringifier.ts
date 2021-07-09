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
  decodeConstructor(statement: Statement): string {
    if (!(statement instanceof ConstructorCall))
      throw new Error(`${statement} is not a constructor`);

    let string = "";

    const args = (statement as ConstructorCall).args;
    for (const arg of args) {
      if (arg instanceof PrimitiveStatement) {
        string = string + this.decodeStatement(arg) + "\n\t";
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

  getImport(statement: Statement): string {
    if (statement instanceof ConstructorCall) {
      // TODO This assumes constructor name is also name of the file
      return `const ${
        (statement as ConstructorCall).constructorName
      } = artifacts.require("${
        (statement as ConstructorCall).constructorName
      }");\n\n`;
    }

    return "";
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
      let testString = "";
      let assertions = "";

      const stack: Statement[] = [];
      const queue: Statement[] = [ind.root];

      if (addLogs) {
        testString += `\t\tawait fs.mkdirSync('${path.join(
          Properties.temp_log_directory,
          ind.id
        )}', { recursive: true })\n`;
      }

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

      const constructor = ind.root;
      stack.push(constructor);

      while (stack.length) {
        const gene: Statement = stack.pop()!;

        if (gene instanceof ConstructorCall) {
          testString += `\t\t${this.decodeConstructor(gene)}\n`;
        } else if (gene instanceof PrimitiveStatement) {
          testString += `\t\t${this.decodeStatement(gene)}\n`;
        } else if (gene instanceof ObjectFunctionCall) {
          testString += `\t\t${this.decodeFunctionCall(
            gene,
            constructor.varName
          )}\n`;
        } else {
          throw Error(`The type of gene ${gene} is not recognized`);
        }

        if (gene instanceof PrimitiveStatement) {
          /*          if (gene.type.startsWith("int") || gene.type.startsWith("uint")) {
            let value: string = (gene as NumericStatement).value.toFixed();
            value = `BigInt("${value}")`;
            assertions += `\t\tassert.equal(${gene.varName}, ${value})\n`;
          } else if (gene instanceof StringStatement){
            assertions += `\t\tassert.equal(${gene.varName}, "${gene.value}")\n`;
          } else {
            assertions += `\t\tassert.equal(${gene.varName}, ${gene.value})\n`;
          }
 */
        } else if (addLogs && gene instanceof ObjectFunctionCall) {
          testString += `\t\tawait fs.writeFileSync('${path.join(
            Properties.temp_log_directory,
            ind.id,
            gene.varName
          )}', '' + ${gene.varName})\n`;
        }

        const importString: string = this.getImport(gene);

        if (!imports.includes(importString) && importString.length) {
          imports.push(importString);
        }
      }

      testString += "\n";

      if (additionalAssertions) {
        if (additionalAssertions.has(ind)) {
          const assertion: any = additionalAssertions.get(ind);
          for (const variableName of Object.keys(assertion)) {
            if (assertion[variableName] === "[object Object]") continue;

            if (variableName.includes("string")) {
              assertions += `\t\tassert.equal(${variableName}, "${assertion[variableName]}")\n`;
            } else if (variableName.includes("int")) {
              assertions += `\t\tassert.equal(${variableName}, BigInt("${assertion[variableName]}"))\n`;
            } else {
              assertions += `\t\tassert.equal(${variableName}, ${assertion[variableName]})\n`;
            }
          }
        }
      }

      // TODO instead of using the targetName use the function call or a better description of the test
      totalTestString +=
        `\tit('test for ${targetName}', async () => {\n` +
        `${testString}` +
        `${assertions}` +
        `\t});\n`;
    }

    let test =
      `contract('${targetName}', (accounts) => {\n` + totalTestString + `\n})`;

    // Add the imports
    test = imports.join("\n") + `\n` + test;

    if (addLogs) {
      test = `const fs = require('fs');\n\n` + test;
    }

    return test;
  }
}
