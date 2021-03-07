import {ObjectFunctionCall, prng, String} from 'syntest-framework'
import {TestCase} from 'syntest-framework'

import {Bool} from 'syntest-framework'
import {Fixed} from 'syntest-framework'
import {Ufixed} from 'syntest-framework'
import {Int} from 'syntest-framework'
import {Uint} from 'syntest-framework'
import {Address} from 'syntest-framework'
import {Statement} from "syntest-framework";
import {Constructor} from "syntest-framework";
import {getProperty} from "syntest-framework";
import {SoliditySampler} from "./SoliditySampler";
import {SolidityTarget} from "../objective/SolidityTarget";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export class SolidityRandomSampler extends SoliditySampler {
    /**
     * Constructor
     */
    constructor(target: SolidityTarget) {
        super(target)
    }

    sampleIndividual (): TestCase {
        const action = prng.pickOne(this.target.getPossibleActions('function'))
        const root = this.sampleObjectFunctionCall(0, action.returnType)

        return new TestCase(root)
    }

    sampleConstructor (depth: number): Constructor {
        const action = prng.pickOne(this.target.getPossibleActions('constructor'))
        // TODO arguments for constructors
        return new Constructor(action.name, `${action.name}Object`, prng.uniqueId(), [])
    }

    sampleArgument (depth: number, type: string): Statement {
        // check depth to decide whether to pick a variable
        if (depth >= getProperty("max_depth")) {
            // TODO or take an already available variable
            return this.sampleGene(depth, type)
        }

        if (this.target.getPossibleActions().filter((a) => a.type === type).length && prng.nextBoolean(getProperty("sample_func_as_arg"))) {
            // Pick function
            // TODO or take an already available functionCall

            return this.sampleObjectFunctionCall(depth, type)
        } else {
            // Pick variable
            // TODO or take an already available variable

            return this.sampleGene(depth, type)
        }
    }

    sampleGene(depth: number, type: string, geneType= 'primitive'): Statement {
        if (geneType === 'primitive') {
            if (type === 'bool') {
                return Bool.getRandom()
            } else if (type === 'address') {
                return Address.getRandom()
            } else if (type === 'string') {
                return String.getRandom()
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
                return String.getRandom()
            } else if (type == "") {
                throw new Error(`THERE U GO!`)
            }
        } else if (geneType === 'functionCall') {
            return this.sampleObjectFunctionCall(depth, type)
        } else if (geneType === 'constructor') {
            return this.sampleConstructor(depth)
        }

        throw new Error(`Unknown type ${type} ${geneType}!`)
    }

    sampleObjectFunctionCall (depth: number, type: string): ObjectFunctionCall {
        const action = prng.pickOne(this.target.getPossibleActions('function', type))

        const args: Statement[] = []

        for (const arg of action.args) {
            if (arg.type != "")
                args.push(this.sampleArgument(depth + 1, arg.type))
        }

        const constructor = this.sampleConstructor(depth + 1)

        return new ObjectFunctionCall(constructor, action.name, action.returnType, prng.uniqueId(), args)
    }
}
