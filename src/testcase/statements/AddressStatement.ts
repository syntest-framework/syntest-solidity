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
 protected account: number;

  constructor(type: string, uniqueId: string, value: string, account: number) {
    super(type, uniqueId, value);
    this.account = account;
  }

  mutate(sampler: TestCaseSampler, depth: number): AddressStatement {
    if (prng.nextBoolean(getProperty("resample_gene_probability"))) {
      return <AddressStatement>(
        sampler.sampleStatement(depth, this.type, "primitive")
      );
    }
    if (prng.nextBoolean || this.account === 0)
        return new AddressStatement(this.type, prng.uniqueId(), `accounts[${this.account+1}]`, this.account + 1);
    else
      return new AddressStatement(this.type, prng.uniqueId(), `accounts[${this.account - 1}]`, this.account  - 1);
  }

  copy(): AddressStatement {
    return new AddressStatement(this.type, this.id, this.value, this.account);
  }

  static getRandom(type = "address") {
    const account = prng.nextInt(0, 5);
    const value = `accounts[${account}]`;

    return new AddressStatement(type, prng.uniqueId(), value, account);
  }
}
