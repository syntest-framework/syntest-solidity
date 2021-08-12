import {
  TestCaseSampler,
  Statement,
  SearchSubject,
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

  protected pool: ConstantPool;

  protected constructor(subject: SearchSubject<SolidityTestCase>, pool: ConstantPool) {
    super(subject);
    this.pool = pool;
  }

  abstract sampleConstructor(depth: number): ConstructorCall;
  abstract sampleObjectFunctionCall(
    depth: number,
    type: string
  ): ObjectFunctionCall;
  abstract sampleArgument(depth: number, type: string, bits: number): Statement;
}
