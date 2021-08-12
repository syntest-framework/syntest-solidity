import { AbstractTestCase, prng, TestCaseDecoder, Encoding, ExecutionResult, ObjectiveFunction, EncodingSampler, getUserInterface  } from "syntest-framework";
import { ConstructorCall } from "./statements/action/ConstructorCall";


/**
 * SolidityTestCase class
 *
 * @author Dimitri Stallenberg
 * @author Mitchell Olsthoorn
 */
export class SolidityTestCase extends AbstractTestCase {
  /**
   * Mapping from objective to their distance values for this test case.
   * @protected
   */
  protected _objectives: Map<ObjectiveFunction<SolidityTestCase>, number>;

  /**
   * The last execution result of this test case.
   * @protected
   */
  protected _executionResult: ExecutionResult;

  /**
   * Constructor.
   *
   * @param root The root of the tree chromosome of the test case
   */
  constructor(root: ConstructorCall) {
    super(root);
  }

  mutate(sampler: EncodingSampler<SolidityTestCase>) {
    getUserInterface().debug(`Mutating test case: ${this._id}`);
    return new SolidityTestCase((this._root as ConstructorCall).mutate(sampler, 0));
  }

  hashCode(decoder: TestCaseDecoder): number {
    const string = decoder.decodeTestCase(this, `${this.id}`);
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      const character = string.charCodeAt(i);
      hash = (hash << 5) - hash + character;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  copy(): SolidityTestCase {
    const copy = this.root.copy() as ConstructorCall;
    for (let index = 0; index < this.root.getChildren().length; index++) {
      copy.setChild(index, this.root.getChildren()[index].copy());
    }

    return new SolidityTestCase(copy);
  }

  getLength(): number {
    return (this.root as ConstructorCall).getMethodCalls().length;
  }
}
