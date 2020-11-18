import {Sampler} from 'syntest-framework'

import {FunctionCall} from 'syntest-framework'

import {Gene} from "syntest-framework";
import {GeneOptionManager} from "syntest-framework";
import {Constructor} from "syntest-framework";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class SoliditySampler extends Sampler {
    /**
     * Constructor
     */
    constructor(geneOptionsObject: GeneOptionManager) {
        super(geneOptionsObject)
    }

    abstract sampleConstructor (depth: number): Constructor
    abstract sampleFunctionCall (depth: number, type: string): FunctionCall
    abstract sampleArgument (depth: number, type: string): Gene
}
