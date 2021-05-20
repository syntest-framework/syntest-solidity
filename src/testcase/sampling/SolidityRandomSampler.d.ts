import { ConstructorCall, ObjectFunctionCall, Statement, TestCase } from "syntest-framework";
import { SoliditySampler } from "./SoliditySampler";
import { ByteStatement } from "../statements/ByteStatement";
import { SoliditySubject } from "../../search/SoliditySubject";
/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export declare class SolidityRandomSampler extends SoliditySampler {
    /**
     * Constructor
     */
    constructor(subject: SoliditySubject<TestCase>);
    sample(): TestCase;
    sampleMethodCall(root: ConstructorCall): ObjectFunctionCall;
    sampleConstructor(depth: number): ConstructorCall;
    sampleArgument(depth: number, type: string, bits: number): Statement;
    sampleNumericGene(depth: number, type: string, bits: number): Statement;
    sampleStatement(depth: number, type: string, geneType?: string): Statement;
    sampleByteStatement(type: string): ByteStatement;
    sampleObjectFunctionCall(depth: number, type: string): ObjectFunctionCall;
}
//# sourceMappingURL=SolidityRandomSampler.d.ts.map