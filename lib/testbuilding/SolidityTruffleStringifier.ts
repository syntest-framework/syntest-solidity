import {Stringifier} from "syntest-framework";
import {Gene} from "syntest-framework";
import {PrimitiveGene} from "syntest-framework";
import {FunctionCall} from "syntest-framework";
import {Individual} from "syntest-framework";
import {Constructor} from "syntest-framework";

export class SolidityTruffleStringifier extends Stringifier {

    private contract: string

    constructor(contract: string) {
        super();
        this.contract = contract
    }

    stringifyGene(gene: Gene): string {

        if (gene instanceof PrimitiveGene) {
            return `const ${gene.getVarName()} = ${(gene as PrimitiveGene).value}`
        } else if (gene instanceof Constructor) {
            let formattedArgs = (gene as Constructor).args
                .map((a: Gene) => this.stringifyGene(a))
                .join(', ')

            return `const ${gene.getVarName()} = await ${(gene as Constructor).constructorName}.deployed(${formattedArgs});`
        } else if (gene instanceof FunctionCall) {
            let formattedArgs = (gene as FunctionCall).args
                .map((a: Gene) => a.getVarName())
                .join(', ')

            if (gene.getType() !== 'none') {
                return `const ${gene.getVarName()} = await ${(gene as FunctionCall).instance.getVarName()}.${(gene as FunctionCall).functionName}.call(${formattedArgs});`
            }
            return `await ${(gene as FunctionCall).instance.getVarName()}.${(gene as FunctionCall).functionName}.call(${formattedArgs});`
        }

        return "";
    }

    stringifyIndividual(individual: Individual, addLogs?: boolean, additionalAssertions?: { [p: string]: string }): string {
        let testString = ''
        let assertions = ''

        let stack: Gene[] = []
        let queue: Gene[] = [individual.root]

        if (addLogs) {
            testString += `\n\nawait fs.mkdirSync('${individual.getId()}', { recursive: true })\n`
        }

        while (queue.length) {
            let current: Gene = queue.splice(0, 1)[0]
            stack.push(current)

            for (let child of current.getChildren()) {
                queue.push(child)
            }
        }

        while (stack.length) {
            let gene = stack.pop()!!
            testString += `\t\t${this.stringifyGene(gene)}\n`

            if (gene instanceof PrimitiveGene) {
                assertions += `\t\tassert.equal(${gene.getVarName()}, ${gene.getValue()})\n`
            } else if (addLogs && gene instanceof FunctionCall) {
                testString += `\t\tfs.appendFileSync('${individual.getId()}/${gene.getVarName()}', ${gene.getVarName()})\n`
            }
        }

        testString += '\n'

        if (additionalAssertions) {
            for (let variableName of Object.keys(additionalAssertions)) {
                assertions += `\t\tassert.equal(${variableName}, ${additionalAssertions[variableName]})\n`
            }
        }

        return `\tit('test for ${this.contract}', async () => {\n`
            + `${testString}`
            + `${assertions}`
            + `\t});`
    }

}