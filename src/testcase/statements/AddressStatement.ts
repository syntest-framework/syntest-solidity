import {
  Properties,
  PrimitiveStatement,
  prng,
  TestCaseSampler,
} from "syntest-framework";
import BigNumber from "bignumber.js";
import {BigIntStats} from "fs";

/**
 * Special statement specific to solidity contracts
 * @author Dimitri Stallenberg
 */
export class AddressStatement extends PrimitiveStatement<string> {
  protected account: BigNumber;

  constructor(type: string, uniqueId: string, value: string, account: BigNumber) {
    super(type, uniqueId, value);
    this._account = account;
  }

  mutate(sampler: TestCaseSampler, depth: number): AddressStatement {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return <AddressStatement>(
        sampler.sampleStatement(depth, this.type, "primitive")
      );
    }

    let change = prng.nextGaussian(0, 100000);
    change = Math.round(change);

    if (change == 0)
      change = prng.nextBoolean() ? -1 : 1;

      return new AddressStatement(
        this.type,
        prng.uniqueId(),
          AddressStatement._getAddress(this.account.plus(change)),
          this.account.plus(change)
      );
  }

  copy(): AddressStatement {
    return new AddressStatement(this.type, this.id, this.value, this._account);
  }

  static getRandom(type = "address") {
    const account = prng.nextBigInt(new BigNumber(0), new BigNumber('1208925819614629174706175'));
    const value = AddressStatement._getAddress(account);

    return new AddressStatement(type, prng.uniqueId(), value, account);
  }

  protected static _getAddress(int: BigNumber): string {
    return '0x'.concat(int.toString(16).padStart(40, "0"))
  }
}
