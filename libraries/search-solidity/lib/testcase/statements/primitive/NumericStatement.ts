/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Solidity.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { prng } from "@syntest/prng";

import BigNumber from "bignumber.js";
import { ConstantPool } from "../../../../../analysis-solidity/lib/constant/ConstantPool";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { Fixed, Parameter, Ufixed } from "@syntest/analysis-solidity";
import { SolidityArguments } from "../../../SolidityLauncher";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";

/**
 * Generic number class
 *
 * Uses BigNumber to allow for numbers larger than allowed by javascript.
 *
 * Documentation on BigNumber:
 * https://www.npmjs.com/package/bignumber.js
 */
export class NumericStatement extends PrimitiveStatement<
  BigNumber,
  Fixed | Ufixed
> {
  private readonly _upper_bound: BigNumber;
  private readonly _lower_bound: BigNumber;

  constructor(
    type: Parameter<Fixed | Ufixed>,
    uniqueId: string,
    value: BigNumber
  ) {
    super(type, uniqueId, value);
    if (type.type.signed) {
      this._upper_bound = new BigNumber(2).pow(type.type.bits - 1).minus(1);
      this._lower_bound = this.upper_bound.negated();
    } else {
      this._upper_bound = new BigNumber(2).pow(type.type.bits).minus(1);
      this._lower_bound = new BigNumber(0);
    }
  }

  mutate(sampler: SoliditySampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      return this.deltaMutation(sampler);
    }

    return sampler.sampleArgument(depth, this.type);
  }

  deltaMutation(sampler: SoliditySampler) {
    // small mutation
    let change = prng.nextGaussian(0, 20);

    if (this.type.type.signed) {
      change = Math.round(change);
      if (change == 0) change = prng.nextBoolean() ? -1 : 1;
    }

    let newValue = this.value.plus(change);

    // If illegal values are not allowed we make sure the value does not exceed the specified bounds
    if (!sampler.exploreIllegalValues) {
      if (newValue.isGreaterThan(this.upper_bound)) {
        newValue = new BigNumber(this.upper_bound);
      } else if (newValue.isLessThan(this.lower_bound)) {
        newValue = new BigNumber(this.lower_bound);
      }
    }

    return new NumericStatement(this.type, this.uniqueId, newValue);
  }

  copy() {
    return new NumericStatement(
      this.type,
      this.uniqueId,
      new BigNumber(this.value)
    );
  }

  get signed(): boolean {
    return this.type.type.signed;
  }

  get upper_bound(): BigNumber {
    return this._upper_bound;
  }

  get lower_bound(): BigNumber {
    return this._lower_bound;
  }
}
