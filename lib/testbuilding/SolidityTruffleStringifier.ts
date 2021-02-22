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

    stringifyIndividual(individual: Individual, addLogs?: boolean, additionalAssertions?: { [p: string]: string }): string {
        let testString = ''
        let assertions = ''

        const stack: Gene[] = []
        const queue: Gene[] = [individual.root]

        if (addLogs) {
            testString += `\t\tawait fs.mkdirSync('${individual.id}', { recursive: true })\n`
        }

        while (queue.length) {
            const current: Gene = queue.splice(0, 1)[0]
            stack.push(current)

            for (const child of current.getChildren()) {
                queue.push(child)
            }
        }

        while (stack.length) {
            const gene = stack.pop()!
            testString += `\t\t${this.stringifyGene(gene)}\n`

            if (gene instanceof PrimitiveGene) {
                assertions += `\t\tassert.equal(${gene.varName}, ${gene.value})\n`
            } else if (addLogs && gene instanceof ObjectFunctionCall) {
                testString += `\t\tawait fs.writeFileSync('${individual.id}/${gene.varName}', '' + ${gene.varName})\n`
            }
        }

        testString += '\n'

        if (additionalAssertions) {
            for (const variableName of Object.keys(additionalAssertions)) {
                assertions += `\t\tassert.equal(${variableName}, ${additionalAssertions[variableName]})\n`
            }
        }

        // TODO target name
        return `\tit('test for ...', async () => {\n`
            + `${testString}`
            + `${assertions}`
            + `\t});`
    }

}
