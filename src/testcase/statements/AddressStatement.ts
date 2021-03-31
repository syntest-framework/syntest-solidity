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
      return <AddressStatement>(
        sampler.sampleStatement(depth, this.type, "primitive")
      );
    }

    return AddressStatement.getRandom();
  }

  copy(): AddressStatement {
    return new AddressStatement(this.type, this.id, this.value);
  }

  static getRandom(type = "address") {
    const value = `accounts[${prng.nextInt(0, 10)}]`;

    return new AddressStatement(type, prng.uniqueId(), value);
  }
}
