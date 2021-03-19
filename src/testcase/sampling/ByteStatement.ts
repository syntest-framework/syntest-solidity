import {
  getProperty,
  PrimitiveStatement,
  prng,
  TestCaseSampler,
} from "syntest-framework";

/**
 * Special statement specific to solidity contracts
 * @author Annibale Panichella
 */
export class ByteStatement extends PrimitiveStatement<number[]> {
  private static _upper_bound = 32;
  private static _lower_bound = 0;

  constructor(type: string, uniqueId: string, bytes: number[]) {
    super(type, uniqueId, bytes);
  }

  copy() {
    return new ByteStatement(this.type, prng.uniqueId(), [...this.value]);
  }

  mutate(sampler: TestCaseSampler, depth: number): ByteStatement {
    if (prng.nextBoolean(getProperty("delta_mutation_probability"))) {
      const index = prng.nextInt(0, this.value.length - 1);

      const change = prng.nextGaussian(0, 3);
      const newBytes = [...this.value];

      const newValue = Math.round(newBytes[index] + change);
      newBytes[index] = Math.max(ByteStatement._lower_bound, newValue);
      newBytes[index] = Math.min(ByteStatement._upper_bound, newValue);

      return new ByteStatement(this.type, prng.uniqueId(), newBytes);
    }

    return ByteStatement.getRandom(this.type, this.value.length);
  }

  static getRandom(type = "byte", nBytes = 1) {
    const bytes: number[] = [];
    for (let index = 0; index < nBytes; index++) {
      bytes[index] = prng.nextInt(
        ByteStatement._lower_bound,
        ByteStatement._upper_bound
      );
    }

    return new ByteStatement(type, prng.uniqueId(), bytes);
  }
}
