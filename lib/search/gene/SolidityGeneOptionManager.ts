import { ActionDescription, GeneOptionManager} from "syntest-framework";

/**
 * @author Dimitri Stallenberg
 */
export class SolidityGeneOptionManager extends GeneOptionManager {
    private contract: string;
    private functionMap: any

    /**
     * Constructor
     */
    constructor(contract: string, functionMap: any) {
        super()
        this.contract = contract;
        this.functionMap = functionMap;
    }

    getConstructorName () {
        return this.contract
    }

    /**
     * This function will find all the possible function calls and their argument types.
     *
     * @returns {[]} A list of function call descriptions
     */
    getPossibleActions (): FunctionDescription[] {
        let possibleTargets: FunctionDescription[] = []

        const fnMap = this.functionMap
        for (let key of Object.keys(fnMap)) {
            let fn = fnMap[key]

            if (fn.name === 'constructor') {
                continue
            }

            let args = fn.functionDefinition.slice(fn.functionDefinition.indexOf('(') + 1, fn.functionDefinition.indexOf(')')).split(',')
            let returnValue = fn.functionDefinition.slice(fn.functionDefinition.lastIndexOf('(') + 1, fn.functionDefinition.lastIndexOf(')')).split(' ')

            let type = returnValue[0]
            let argumentDescriptions = args.map((a: any) => {
                let split = a.trim().split(' ')
                let typeName = split[0]

                let arg: ArgumentDescription = {
                    type: typeName,
                    bits: 0,
                    decimals: 0
                }

                if (typeName.includes('int')) {
                    let type = typeName.includes('uint') ? 'uint' : 'int'
                    let bits = typeName.replace(type, '')
                    arg.type = type
                    if (bits && bits.length) {
                        arg.bits = parseInt(bits)
                    } else {
                        arg.bits = 256
                    }

                } else if (typeName.includes('fixed')) {
                    let type = typeName.includes('ufixed') ? 'ufixed' : 'fixed'
                    let params = typeName.replace(type, '')
                    params = params.split('x')
                    arg.type = type
                    arg.bits = parseInt(params[0]) || 128
                    arg.decimals = parseInt(params[1]) || 18
                }

                return arg
            })


            possibleTargets.push({
                name: fn.name,
                type: type,
                args: argumentDescriptions,
            })

        }

        return possibleTargets
    }
}
export interface FunctionDescription extends ActionDescription {
    name: string,
    type: string,
    args: ArgumentDescription[],
}

export interface ArgumentDescription {
    type: string
    bits?: number
    decimals?: number
}

