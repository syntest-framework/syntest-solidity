import {Numeric, ObjectFunctionCall, prng, String} from 'syntest-framework'
import {TestCase} from 'syntest-framework'

import {Bool} from 'syntest-framework'

import {Statement} from "syntest-framework";
import {Constructor} from "syntest-framework";
import {getProperty} from "syntest-framework";
import {SoliditySampler} from "./SoliditySampler";
import {SolidityTarget} from "../..";
import {Address} from "../../testcase/Address";

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
        let constructors = this.target.getPossibleActions('constructor')
        if (constructors.length > 0) {
            const action = prng.pickOne(this.target.getPossibleActions('constructor'))
            // TODO arguments for constructors
            return new Constructor(action.name, prng.uniqueId(), `${action.name}`, [])
        } else {
            // if no constructors is available, we invoke the default (implicit) constructor
            return new Constructor(this.target.name, prng.uniqueId(), `${this.target.name}`, [])
        }
    }

    sampleArgument (depth: number, type: string, bits: number): Statement {
        // check depth to decide whether to pick a variable
        if (depth >= getProperty("max_depth")) {
            // TODO or take an already available variable
            if (type.includes('int')) {
                return this.sampleNumericGene(depth, type, bits)
            } else {
                return this.sampleGene(depth, type)
            }

        }

        if (this.target.getPossibleActions().filter((a) => a.type === type).length && prng.nextBoolean(getProperty("sample_func_as_arg"))) {
            // Pick function
            // TODO or take an already available functionCall

            return this.sampleObjectFunctionCall(depth, type)
        } else {
            // Pick variable
            // TODO or take an already available variable
            if (type.includes('int')) {
                return this.sampleNumericGene(depth, type, bits)
            } else {
                return this.sampleGene(depth, type)
            }
        }
    }

    sampleNumericGene(depth: number, type: string, bits: number): Statement {
        let max = Math.pow(2, bits) - 1;
        if (type.includes('uint')) {
            return Numeric.getRandom('uint', 0, max, false)
        } else {
            return Numeric.getRandom('int', 0, max, true)
        }
        if (type.includes('ufixed')) {
            return Numeric.getRandom('ufixed', getProperty('numeric_decimals'), max, false)

        } else {
            return Numeric.getRandom('fixed', getProperty('numeric_decimals'), max, true)
        }
    }

    sampleGene(depth: number, type: string, geneType= 'primitive'): Statement {
        // TODO incorporate bits & decimals in the numeric types
        if (geneType === 'primitive') {
            if (type === 'bool') {
                return Bool.getRandom()
            } else if (type === 'address') {
                return Address.getRandom()
            } else if (type === 'string') {
                return String.getRandom()
            } else if (type.includes('string')) {
                return String.getRandom()
            } else if (type == "") {
                throw new Error(`Weird!`)
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
                args.push(this.sampleArgument(depth + 1, arg.type, arg.bits))
        }

        const constructor = this.sampleConstructor(depth + 1)

        return new ObjectFunctionCall(action.returnType, prng.uniqueId(), constructor, action.name, args)
    }
}
