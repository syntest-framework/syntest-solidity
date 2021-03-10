import {getProperty, ObjectFunctionCall, Stringifier} from "syntest-framework";
import {Statement} from "syntest-framework";
import {PrimitiveStatement} from "syntest-framework";
import {TestCase} from "syntest-framework";
import {Constructor} from "syntest-framework";
import * as path from "path";

export class SolidityTruffleStringifier implements Stringifier {

    stringifyGene(statement: Statement): string {
        if (statement instanceof PrimitiveStatement) {
            return `const ${statement.varName} = ${(statement as PrimitiveStatement<any>).value}`
        } else if (statement instanceof Constructor) {
            const formattedArgs = (statement as Constructor).args
                .map((a: Statement) => this.stringifyGene(a))
                .join(', ')

            return `const ${statement.varName} = await ${(statement as Constructor).constructorName}.deployed(${formattedArgs});`
        } else if (statement instanceof ObjectFunctionCall) {
            const args = (statement as ObjectFunctionCall).getChildren()
            const instance = args.shift() as Constructor
            const formattedArgs = args
                .map((a: Statement) => a.varName)
                .join(', ')

            if (instance === undefined)
                throw new Error("This never happens, but we have to do it because the compiler is dumb")

            if (statement.type !== 'none') {
                return `const ${statement.varName} = await ${instance.varName}.${(statement as ObjectFunctionCall).functionName}.call(${formattedArgs});`
            }
            return `await ${instance.varName}.${(statement as ObjectFunctionCall).functionName}.call(${formattedArgs});`
        }

        return "";
    }

    getImport(statement: Statement): string {
        if (statement instanceof Constructor) {
            // TODO This assumes constructor name is also name of the file
            return `const ${(statement as Constructor).constructorName} = artifacts.require("${(statement as Constructor).constructorName}");\n\n`
        }

        return ""
    }

    stringifyIndividual(individual: TestCase | TestCase[], targetName: string, addLogs?: boolean, additionalAssertions?: Map<TestCase, { [p: string]: string }>): string {
        if (individual instanceof TestCase) {
            individual = [individual]
        }

        let totalTestString = ''

        const imports: string[] = []

        for (const ind of individual) {
            let testString = ''
            let assertions = ''

            const stack: Statement[] = []
            const queue: Statement[] = [ind.root]

            if (addLogs) {
                testString += `\t\tawait fs.mkdirSync('${path.join(getProperty('temp_log_directory'), ind.id)}', { recursive: true })\n`
            }

            while (queue.length) {
                const current: Statement = queue.splice(0, 1)[0]
                stack.push(current)

                for (const child of current.getChildren()) {
                    queue.push(child)
                }
            }

            while (stack.length) {
                const gene: Statement = stack.pop()!
                testString += `\t\t${this.stringifyGene(gene)}\n`

                if (gene instanceof PrimitiveStatement) {
                    assertions += `\t\tassert.equal(${gene.varName}, ${gene.value})\n`
                } else if (addLogs && gene instanceof ObjectFunctionCall) {
                    testString += `\t\tawait fs.writeFileSync('${path.join(getProperty('temp_log_directory'), ind.id, gene.varName)}', '' + ${gene.varName})\n`
                }

                const importString: string = this.getImport(gene)

                if (!imports.includes(importString) && importString.length) {
                    imports.push(importString)
                }
            }

            testString += '\n'

            if (additionalAssertions) {
                const assertion: any = additionalAssertions.get(ind);
                for (const variableName of Object.keys(assertion)) {
                    assertions += `\t\tassert.equal(${variableName}, ${assertion[variableName]})\n`
                }
            }

            // TODO instead of using the targetName use the function call or a better description of the test
            totalTestString += `\tit('test for ${targetName}', async () => {\n`
                + `${testString}`
                + `${assertions}`
                + `\t});\n`
        }



        let test = `contract('${targetName}', (accounts) => {\n`
            + totalTestString
            + `\n})`


        // Add the imports
        test = imports.join("\n") + `\n` + test

        if (addLogs) {
            test = `const fs = require('fs');\n\n` + test
        }

        return test
    }
}
