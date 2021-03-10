import {ObjectFunctionCall, Sampler} from 'syntest-framework'

import {Statement} from "syntest-framework";
import {Constructor} from "syntest-framework";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class SoliditySampler extends Sampler {

    abstract sampleConstructor (depth: number): Constructor
    abstract sampleObjectFunctionCall (depth: number, type: string): ObjectFunctionCall
    abstract sampleArgument (depth: number, type: string): Statement
}
