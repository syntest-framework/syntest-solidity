import { PrimitiveStatement } from "syntest-framework/dist/testcase/statements/PrimitiveStatement";
import { TestCaseSampler } from "syntest-framework/dist/testcase/sampling/TestCaseSampler";
import { prng } from "syntest-framework/dist/util/prng";
import { Properties } from "syntest-framework/dist/properties";

/**
 * @author Dimitri Stallenberg
 */
export class BoolStatement extends PrimitiveStatement<boolean> {
  constructor(type: string, uniqueId: string, value: boolean) {
    super(type, uniqueId, value);
  }

  mutate(sampler: TestCaseSampler, depth: number) {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return BoolStatement.getRandom();
    }

    return new BoolStatement(this.type, this.id, !this.value);
  }

  copy() {
    return new BoolStatement(this.type, this.id, this.value);
  }

  static getRandom(type = "bool") {
    return new BoolStatement(type, prng.uniqueId(), prng.nextBoolean());
  }
}
