import {
  Properties,
  PrimitiveStatement,
  prng,
  TestCaseSampler,
} from "@syntest-framework/syntest-framework";

/**
 * Special statement specific to solidity contracts
 * @author Dimitri Stallenberg
 */
export class AddressStatement extends PrimitiveStatement<string> {
  private _account: number;

  constructor(type: string, uniqueId: string, value: string, account: number) {
    super(type, uniqueId, value);
    this._account = account;
  }

  mutate(sampler: TestCaseSampler, depth: number): AddressStatement {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return <AddressStatement>(
        sampler.sampleStatement(depth, this.type, "primitive")
      );
    }
    if (prng.nextBoolean)
      return new AddressStatement(
        this.type,
        prng.uniqueId(),
        `accounts[${this._account + 1}]`,
        this._account + 1
      );
    else
      return new AddressStatement(
        this.type,
        prng.uniqueId(),
        `accounts[${this._account - 1}]`,
        this._account - 1
      );
  }

  copy(): AddressStatement {
    return new AddressStatement(this.type, this.id, this.value, this._account);
  }

  static getRandom(type = "address") {
    const account = prng.nextInt(-1, 5);
    const value = `accounts[${account}]`;

    return new AddressStatement(type, prng.uniqueId(), value, account);
  }

  get account(): number {
    return this._account;
  }
}
