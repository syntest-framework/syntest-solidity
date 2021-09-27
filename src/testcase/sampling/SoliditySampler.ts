import {
  TestCaseSampler,
  Statement,
  SearchSubject,
  Parameter,
} from "syntest-framework";
import { ConstantPool } from "../../seeding/constant/ConstantPool";
import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class SoliditySampler extends TestCaseSampler {
  protected readonly POOL_PROB = 0.5;

  protected constructor(subject: SearchSubject<SolidityTestCase>) {
    super(subject);
  }

  abstract sampleConstructor(depth: number): ConstructorCall;
  abstract sampleObjectFunctionCall(
    depth: number,
    types: Parameter[]
  ): ObjectFunctionCall;
  abstract sampleArgument(
    depth: number,
    type: Parameter,
    bits: number
  ): Statement;
}
