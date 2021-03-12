import {
  ConstructorCall,
  getProperty,
  ObjectFunctionCall,
  PrimitiveStatement,
  NumericStatement,
  Statement,
  StringStatement,
  Stringifier,
  TestCase,
} from "syntest-framework";
import * as path from "path";

export class SolidityTruffleStringifier implements Stringifier {
  stringifyConstructor(statement: Statement): string {
    if (!(statement instanceof ConstructorCall))
      throw new Error(`${statement} is not a constructor`);

    const formattedArgs = (statement as ConstructorCall).args
      .map((a: Statement) => {
        if (a instanceof PrimitiveStatement) this.stringifyGene(a);
      })
      .join(", ");

    return `const ${statement.varName} = await ${
      (statement as ConstructorCall).constructorName
    }.deployed(${formattedArgs});`;
  }

  stringifyGene(statement: Statement): string {
    if (!(statement instanceof PrimitiveStatement)) {
      throw new Error(`${statement} is not a primitive statement`);
    }

    const primitive: PrimitiveStatement<any> = statement as PrimitiveStatement<any>;
    if (statement.type.startsWith("int") || statement.type.startsWith("uint")) {
      const value = primitive.value.toFixed();
      return `const ${statement.varName} = BigInt(\"${value}\")`;
    } else if (statement instanceof StringStatement) {
      return `const ${statement.varName} = \"${primitive.value}\"`;
    } else {
      return `const ${statement.varName} = ${primitive.value}`;
    }
  }

  stringifyFunctionCall(statement: Statement, objectName: string): string {
    if (statement instanceof ObjectFunctionCall) {
      const args = (statement as ObjectFunctionCall).getChildren();
      const formattedArgs = args.map((a: Statement) => a.varName).join(", ");

      if (statement.type !== "none") {
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

  stringifyIndividual(
    individual: TestCase | TestCase[],
    targetName: string,
    addLogs?: boolean,
    additionalAssertions?: Map<TestCase, { [p: string]: string }>
  ): string {
    if (individual instanceof TestCase) {
      individual = [individual];
    }

    let totalTestString = "";

    const imports: string[] = [];

    for (const ind of individual) {
      let testString = "";
      let assertions = "";

      const stack: Statement[] = [];
      const queue: Statement[] = [ind.root];

      if (addLogs) {
        testString += `\t\tawait fs.mkdirSync('${path.join(
          getProperty("temp_log_directory"),
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
          testString += `\t\t${this.stringifyConstructor(gene)}\n`;
        } else if (gene instanceof PrimitiveStatement) {
          testString += `\t\t${this.stringifyGene(gene)}\n`;
        } else if (gene instanceof ObjectFunctionCall) {
          testString += `\t\t${this.stringifyFunctionCall(
            gene,
            constructor.varName
          )}\n`;
        } else {
          throw Error(`The type of gene ${gene} is not recognized`);
        }

        if (gene instanceof PrimitiveStatement) {
          /*
          if (gene.type.startsWith("int") || gene.type.startsWith("uint")) {
            let value: string = (gene as NumericStatement).value.toFixed();
            value = `BigInt(\"${value}\")`;
            assertions += `\t\tassert.equal(${gene.varName}, ${value})\n`;
          } else if (gene instanceof StringStatement){
            assertions += `\t\tassert.equal(${gene.varName}, \"${gene.value}\")\n`;
          } else {
            assertions += `\t\tassert.equal(${gene.varName}, ${gene.value})\n`;
          }
           */
        } else if (addLogs && gene instanceof ObjectFunctionCall) {
          testString += `\t\tawait fs.writeFileSync('${path.join(
            getProperty("temp_log_directory"),
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
        const assertion: any = additionalAssertions.get(ind);
        for (const variableName of Object.keys(assertion)) {
          assertions += `\t\tassert.equal(${variableName}, ${assertion[variableName]})\n`;
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
