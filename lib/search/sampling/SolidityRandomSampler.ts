import {prng, StringGene} from 'syntest-framework'
import {Individual} from 'syntest-framework'

import {FunctionCall} from 'syntest-framework'

import {Bool} from 'syntest-framework'
import {Fixed} from 'syntest-framework'
import {Ufixed} from 'syntest-framework'
import {Int} from 'syntest-framework'
import {Uint} from 'syntest-framework'
import {Address} from 'syntest-framework'
import {Gene} from "syntest-framework";
import {GeneOptionManager} from "syntest-framework";
import {Constructor} from "syntest-framework";
import {getProperty} from "syntest-framework";
import {SoliditySampler} from "./SoliditySampler";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export class SolidityRandomSampler extends SoliditySampler {
    /**
     * Constructor
     */
    constructor(geneOptionsObject: GeneOptionManager) {
        super(geneOptionsObject)
    }

    sampleIndividual () {
        let action = prng.pickOne(this.geneOptionsObject.possibleActions)
        let root = this.sampleFunctionCall(0, action.type)

        return new Individual(root)
    }

    sampleConstructor (depth: number): Constructor {
        // TODO arguments for constructors
        return new Constructor(this.geneOptionsObject.getConstructorName(), `${this.geneOptionsObject.getConstructorName()}Object`, prng.uniqueId(), [])
    }


    sampleArgument (depth: number, type: string): Gene {
        // check depth to decide whether to pick a variable
        if (depth >= getProperty("max_depth")) {
            // TODO or take an already available variable
            return this.sampleGene(depth, type)
        }

        if (this.geneOptionsObject.possibleActions.filter((a) => a.type === type).length && prng.nextBoolean(getProperty("sample_func_as_arg"))) {
            // Pick function
            // TODO or take an already available functionCall

            return this.sampleFunctionCall(depth, type)
        } else {
            // Pick variable
            // TODO or take an already available variable

            return this.sampleGene(depth, type)
        }
    }

    sampleGene(depth: number, type: string, geneType= 'primitive'): Gene {
        if (geneType === 'primitive') {
            if (type === 'bool') {
                return Bool.getRandom()
            } else if (type === 'address') {
                return Address.getRandom()
            } else if (type === 'string') {
                return StringGene.getRandom()
            } else if (type.includes('int')) {
                if (type.includes('uint')) {
                    return Uint.getRandom()

                } else {
                    return Int.getRandom()

                }
            } else if (type.includes('fixed')) {
                if (type.includes('ufixed')) {
                    return Ufixed.getRandom()

                } else {
                    return Fixed.getRandom()
                }
            } else if (type.includes('string')) {
                return StringGene.getRandom()
            }
        } else if (geneType === 'functionCall') {
            return this.sampleFunctionCall(depth, type)
        } else if (geneType === 'constructor') {
            return this.sampleConstructor(depth)
        }

        throw new Error(`Unknown type ${type} ${geneType}!`)
    }

    sampleFunctionCall (depth: number, type: string): FunctionCall {
        let action = prng.pickOne(this.geneOptionsObject.possibleActions.filter((a) => a.type === type))

        let args: Gene[] = []

        for (let arg of action.args) {
            args.push(this.sampleArgument(depth + 1, arg.type))
        }

        let constructor = this.sampleConstructor(depth + 1)

        return new FunctionCall(constructor, action.name, action.type, prng.uniqueId(), args)
    }
}
