import {
  getProperty,
  PrimitiveStatement,
  prng,
  TestCaseSampler,
} from "syntest-framework";

/**
 * Special statement specific to solidity contracts
 * @author Dimitri Stallenberg
 */
export class AddressStatement extends PrimitiveStatement<string> {
  constructor(type: string, uniqueId: string, value: string) {
    super(type, uniqueId, value);
  }

  mutate(sampler: TestCaseSampler, depth: number): AddressStatement {
    if (prng.nextBoolean(getProperty("resample_gene_probability"))) {
      return sampler.sampleGene(depth, this.type, "primitive");
    }

    return this.copy();
  }

  copy(): AddressStatement {
    return new AddressStatement(this.type, this.id, this.value);
  }

  static getRandom(type = "string") {
    const value = "accounts[0]";

    return new AddressStatement(type, prng.uniqueId(), value);
  }
}
