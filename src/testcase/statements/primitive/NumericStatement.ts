import { PrimitiveStatement } from "syntest-framework/dist/testcase/statements/PrimitiveStatement";
import BigNumber from "bignumber.js";
import { TestCaseSampler } from "syntest-framework/dist/testcase/sampling/TestCaseSampler";
import { prng } from "syntest-framework/dist/util/prng";
import { Properties } from "syntest-framework/dist/properties";

/**
 * Generic number class
 *
 * Uses BigNumber to allow for numbers larger than allowed by javascript.
 *
 * Documentation on BigNumber:
 * https://www.npmjs.com/package/bignumber.js
 *
 * @author Dimitri Stallenberg
 */
export class NumericStatement extends PrimitiveStatement<BigNumber> {
  private static _max_value: number = Number.MAX_SAFE_INTEGER;
  private static _zero = new BigNumber(0);

  private _decimals: number;
  private _signed: boolean;
  private _upper_bound: BigNumber;
  private _lower_bound: BigNumber;

  constructor(
    type: string,
    uniqueId: string,
    value: BigNumber,
    decimals = 0,
    signed = true,
    upper_bound = new BigNumber(Number.MAX_SAFE_INTEGER),
    lower_bound = new BigNumber(-Number.MAX_SAFE_INTEGER)
  ) {
    super(type, uniqueId, value);
    this._decimals = decimals;
    this._signed = signed;
    this._upper_bound = upper_bound;
    this._lower_bound = lower_bound;
  }

  mutate(sampler: TestCaseSampler, depth: number): NumericStatement {
    if (prng.nextBoolean(Properties.delta_mutation_probability)) {
      return this.deltaMutation();
    }

    return NumericStatement.getRandom(
      this.type,
      this.decimals,
      this.signed,
      this.upper_bound,
      this.lower_bound
    );
  }

  deltaMutation() {
    // small mutation
    let change = prng.nextGaussian(0, 20);

    if (this.type.includes("int")) {
      change = Math.round(change);
      if (change == 0) change = prng.nextBoolean() ? -1 : 1;
    }

    let newValue = this.value.plus(change);

    // If illegal values are not allowed we make sure the value does not exceed the specified bounds
    if (!Properties.explore_illegal_values) {
      const max = this.upper_bound;
      const min = this._signed ? this.lower_bound : NumericStatement._zero;

      if (newValue.isGreaterThan(max)) {
        newValue = new BigNumber(max);
      } else if (newValue.isLessThan(min)) {
        newValue = new BigNumber(min);
      }
    }

    return new NumericStatement(
      this.type,
      this.id,
      newValue,
      this._decimals,
      this._signed,
      this._upper_bound,
      this._lower_bound
    );
  }

  copy() {
    return new NumericStatement(
      this.type,
      prng.uniqueId(),
      new BigNumber(this.value),
      this._decimals,
      this._signed,
      this._upper_bound,
      this._lower_bound
    );
  }

  static getRandom(
    type = "number",
    decimals = Properties.numeric_decimals,
    signed = Properties.numeric_signed,
    upper_bound = new BigNumber(Number.MAX_SAFE_INTEGER),
    lower_bound = new BigNumber(Number.MAX_SAFE_INTEGER)
  ) {
    // by default we create small numbers (do we need very large numbers?)
    const max = BigNumber.min(upper_bound, new BigNumber(Math.pow(2, 11) - 1));
    const min: BigNumber = signed ? max.negated() : this._zero;

    return new NumericStatement(
      type,
      prng.uniqueId(),
      prng.nextBigDouble(min, max),
      decimals,
      signed,
      upper_bound,
      lower_bound
    );
  }

  /**
   * Make sure that whenever the value is used it is the wanted precision.
   */
  get value(): BigNumber {
    return super.value.decimalPlaces(this._decimals);
  }

  get decimals(): number {
    return this._decimals;
  }

  get signed(): boolean {
    return this._signed;
  }

  get upper_bound(): BigNumber {
    return this._upper_bound;
  }

  get lower_bound(): BigNumber {
    return this._lower_bound;
  }
}
