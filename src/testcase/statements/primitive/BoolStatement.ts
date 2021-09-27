import { PrimitiveStatement } from "syntest-framework/dist/testcase/statements/PrimitiveStatement";
import { TestCaseSampler } from "syntest-framework/dist/testcase/sampling/TestCaseSampler";
import { prng } from "syntest-framework/dist/util/prng";
import { Properties } from "syntest-framework/dist/properties";
import { Parameter } from "syntest-framework";

/**
 * @author Dimitri Stallenberg
 */
export class BoolStatement extends PrimitiveStatement<boolean> {
  constructor(type: Parameter, uniqueId: string, value: boolean) {
    super(type, uniqueId, value);
  }

  mutate(sampler: TestCaseSampler, depth: number) {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return BoolStatement.getRandom(this.type);
    }

    return new BoolStatement(this.type, this.id, !this.value);
  }

  copy() {
    return new BoolStatement(this.type, this.id, this.value);
  }

  static getRandom(
    type: Parameter = { type: "bool", name: "noname" }
  ): PrimitiveStatement<any> {
    return new BoolStatement(type, prng.uniqueId(), prng.nextBoolean());
  }
}
