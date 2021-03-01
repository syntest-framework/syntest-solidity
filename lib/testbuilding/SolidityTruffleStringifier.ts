import {ObjectFunctionCall, Stringifier} from "syntest-framework";
import {Gene} from "syntest-framework";
import {PrimitiveGene} from "syntest-framework";
import {Individual} from "syntest-framework";
import {Constructor} from "syntest-framework";

export class SolidityTruffleStringifier implements Stringifier {

    stringifyGene(gene: Gene): string {
        if (gene instanceof PrimitiveGene) {
            return `const ${gene.varName} = ${(gene as PrimitiveGene<any>).value}`
        } else if (gene instanceof Constructor) {
            const formattedArgs = (gene as Constructor).args
                .map((a: Gene) => this.stringifyGene(a))
                .join(', ')

            return `const ${gene.varName} = await ${(gene as Constructor).constructorName}.deployed(${formattedArgs});`
        } else if (gene instanceof ObjectFunctionCall) {
            const args = (gene as ObjectFunctionCall).getChildren()
            const instance = args.shift() as Constructor
            const formattedArgs = args
                .map((a: Gene) => a.varName)
                .join(', ')

            if (gene.type !== 'none') {
                return `const ${gene.varName} = await ${instance.varName}.${(gene as ObjectFunctionCall).functionName}.call(${formattedArgs});`
            }
            return `await ${instance.varName}.${(gene as ObjectFunctionCall).functionName}.call(${formattedArgs});`
        }

        return "";
    }

    getImport(gene: Gene): string {
        if (gene instanceof Constructor) {
            // TODO This assumes constructor name is also name of the file
            return `const ${(gene as Constructor).constructorName} = artifacts.require("${(gene as Constructor).constructorName}");\n\n`
        }

        return ""
    }

    stringifyIndividual(individual: Individual | Individual[], targetName: string, addLogs?: boolean, additionalAssertions?: Map<Individual, { [p: string]: string }>): string {
        if (individual instanceof Individual) {
            individual = [individual]
        }

        let totalTestString = ''

        const imports: string[] = []

        for (const ind of individual) {
            let testString = ''
            let assertions = ''

            const stack: Gene[] = []
            const queue: Gene[] = [ind.root]

            if (addLogs) {
                testString += `\t\tawait fs.mkdirSync('temp_logs/${ind.id}', { recursive: true })\n`
            }

            while (queue.length) {
                const current: Gene = queue.splice(0, 1)[0]
                stack.push(current)

                for (const child of current.getChildren()) {
                    queue.push(child)
                }
            }

            while (stack.length) {
                const gene: Gene = stack.pop()!
                testString += `\t\t${this.stringifyGene(gene)}\n`

                if (gene instanceof PrimitiveGene) {
                    assertions += `\t\tassert.equal(${gene.varName}, ${gene.value})\n`
                } else if (addLogs && gene instanceof ObjectFunctionCall) {
                    testString += `\t\tawait fs.writeFileSync('temp_logs/${ind.id}/${gene.varName}', '' + ${gene.varName})\n`
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
