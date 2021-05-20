"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityTruffleStringifier = void 0;
const syntest_framework_1 = require("syntest-framework");
const path = require("path");
const web3_utils = require("web3-utils");
const ByteStatement_1 = require("../testcase/statements/ByteStatement");
const AddressStatement_1 = require("../testcase/statements/AddressStatement");
/**
 * @author Dimitri Stallenberg
 * @author Mitchell Olsthoorn
 */
class SolidityTruffleStringifier {
    decodeConstructor(statement) {
        if (!(statement instanceof syntest_framework_1.ConstructorCall))
            throw new Error(`${statement} is not a constructor`);
        let string = "";
        const args = statement.args;
        for (const arg of args) {
            if (arg instanceof syntest_framework_1.PrimitiveStatement) {
                string = string + this.decodeStatement(arg) + "\n\t";
            }
        }
        const formattedArgs = args
            .map((a) => a.varName)
            .join(", ");
        return (string +
            `\t` +
            `const ${statement.varName} = await ${statement.constructorName}.new(${formattedArgs});`);
    }
    decodeStatement(statement) {
        if (!(statement instanceof syntest_framework_1.PrimitiveStatement)) {
            throw new Error(`${statement} is not a primitive statement`);
        }
        const primitive = statement;
        if (statement.type.startsWith("int") || statement.type.startsWith("uint")) {
            const value = primitive.value.toFixed();
            return `const ${statement.varName} = BigInt("${value}")`;
        }
        else if (statement instanceof syntest_framework_1.StringStatement) {
            return `const ${statement.varName} = "${primitive.value}"`;
        }
        else if (statement instanceof AddressStatement_1.AddressStatement) {
            if (statement.account < 0) {
                const address = "0x".concat((-statement.account).toString(16).padStart(40, "0"));
                return `const ${statement.varName} = "${address}"`;
            }
            else {
                return `const ${statement.varName} = ${primitive.value}`;
            }
        }
        else if (statement instanceof ByteStatement_1.ByteStatement) {
            const bytes = web3_utils.bytesToHex(statement.value);
            return `const ${statement.varName} = "${bytes}"`;
        }
        else {
            return `const ${statement.varName} = ${primitive.value}`;
        }
    }
    decodeFunctionCall(statement, objectName) {
        if (statement instanceof syntest_framework_1.ObjectFunctionCall) {
            const args = statement.getChildren();
            const formattedArgs = args.map((a) => a.varName).join(", ");
            if (statement.type !== "none" &&
                statement.type !== "" &&
                !statement.varName.includes(",")) {
                return `const ${statement.varName} = await ${objectName}.${statement.functionName}.call(${formattedArgs});`;
            }
            return `await ${objectName}.${statement.functionName}.call(${formattedArgs});`;
        }
        else {
            throw new Error(`${statement} is not a function call`);
        }
    }
    getImport(statement) {
        if (statement instanceof syntest_framework_1.ConstructorCall) {
            // TODO This assumes constructor name is also name of the file
            return `const ${statement.constructorName} = artifacts.require("${statement.constructorName}");\n\n`;
        }
        return "";
    }
    decodeTestCase(testCase, targetName, addLogs, additionalAssertions) {
        if (testCase instanceof syntest_framework_1.TestCase) {
            testCase = [testCase];
        }
        let totalTestString = "";
        const imports = [];
        for (const ind of testCase) {
            let testString = "";
            let assertions = "";
            const stack = [];
            const queue = [ind.root];
            if (addLogs) {
                testString += `\t\tawait fs.mkdirSync('${path.join(syntest_framework_1.Properties.temp_log_directory, ind.id)}', { recursive: true })\n`;
            }
            while (queue.length) {
                const current = queue.splice(0, 1)[0];
                if (current instanceof syntest_framework_1.ConstructorCall) {
                    for (const call of current.getMethodCalls()) {
                        queue.push(call);
                    }
                }
                else {
                    stack.push(current);
                    for (const child of current.getChildren()) {
                        queue.push(child);
                    }
                }
            }
            const constructor = ind.root;
            stack.push(constructor);
            while (stack.length) {
                const gene = stack.pop();
                if (gene instanceof syntest_framework_1.ConstructorCall) {
                    testString += `\t\t${this.decodeConstructor(gene)}\n`;
                }
                else if (gene instanceof syntest_framework_1.PrimitiveStatement) {
                    testString += `\t\t${this.decodeStatement(gene)}\n`;
                }
                else if (gene instanceof syntest_framework_1.ObjectFunctionCall) {
                    testString += `\t\t${this.decodeFunctionCall(gene, constructor.varName)}\n`;
                }
                else {
                    throw Error(`The type of gene ${gene} is not recognized`);
                }
                if (gene instanceof syntest_framework_1.PrimitiveStatement) {
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
                }
                else if (addLogs && gene instanceof syntest_framework_1.ObjectFunctionCall) {
                    testString += `\t\tawait fs.writeFileSync('${path.join(syntest_framework_1.Properties.temp_log_directory, ind.id, gene.varName)}', '' + ${gene.varName})\n`;
                }
                const importString = this.getImport(gene);
                if (!imports.includes(importString) && importString.length) {
                    imports.push(importString);
                }
            }
            testString += "\n";
            if (additionalAssertions) {
                if (additionalAssertions.has(ind)) {
                    const assertion = additionalAssertions.get(ind);
                    for (const variableName of Object.keys(assertion)) {
                        if (assertion[variableName] === "[object Object]")
                            continue;
                        if (variableName.includes("string")) {
                            assertions += `\t\tassert.equal(${variableName}, "${assertion[variableName]}")\n`;
                        }
                        else if (variableName.includes("int")) {
                            assertions += `\t\tassert.equal(${variableName}, BigInt("${assertion[variableName]}"))\n`;
                        }
                        else {
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
        let test = `contract('${targetName}', (accounts) => {\n` + totalTestString + `\n})`;
        // Add the imports
        test = imports.join("\n") + `\n` + test;
        if (addLogs) {
            test = `const fs = require('fs');\n\n` + test;
        }
        return test;
    }
}
exports.SolidityTruffleStringifier = SolidityTruffleStringifier;
//# sourceMappingURL=SolidityTruffleStringifier.js.map