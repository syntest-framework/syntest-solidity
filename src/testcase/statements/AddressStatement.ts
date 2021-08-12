import {
  Properties,
  PrimitiveStatement,
  prng,
  TestCaseSampler,
} from "syntest-framework";
import { ConstantPool } from "../../seeding/constant/ConstantPool";

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

    if (this.value.startsWith("0x")){
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
    return new AddressStatement(this.type, prng.uniqueId(), this.value, this._account);
  }

  static getRandom(type = "address") {
    let account = -1;
    if (prng.nextDouble(0, 1) <= Properties.constant_pool_probability){
      const value = ConstantPool.getInstance().getAddress();
      if (value != null){
        return new AddressStatement(type, prng.uniqueId(), value, account);
      }
    }

    account = prng.nextInt(-1, 5);
    if (account < 0){
      const value = "0x".concat(account.toString(16).padStart(40, "0"));
      return new AddressStatement(type, prng.uniqueId(), value, account);
    }

    const value = `accounts[${account}]`;
    return new AddressStatement(type, prng.uniqueId(), value, account);
  }

  get account(): number {
    return this._account;
  }

  public toCode(): string {
    return `const ${this.varName} = ${this.value}`;
  }
}
