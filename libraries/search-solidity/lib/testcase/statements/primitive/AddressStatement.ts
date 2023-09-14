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
import { Address, Parameter } from "@syntest/analysis-solidity";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { PrimitiveStatement } from "./PrimitiveStatement";

/**
 * Special statement specific to solidity contracts
 */
export class AddressStatement extends PrimitiveStatement<string, Address> {
  private readonly _account: number;

  constructor(
    type: Parameter,
    uniqueId: string,
    value: string,
    account: number
  ) {
    super(type, uniqueId, value);
    this._account = account;
  }

  mutate(sampler: SoliditySampler, depth: number): AddressStatement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      if (this.value.startsWith("0x")) {
        const newAccount = prng.nextBoolean(0.5)
          ? this.account + 1
          : this.account - 1;
        const value = "0x".concat((-newAccount).toString(16).padStart(40, "0"));
        return new AddressStatement(
          this.type,
          prng.uniqueId(),
          value,
          newAccount
        );
      }
  
      return prng.nextBoolean ? new AddressStatement(
          this.type,
          prng.uniqueId(),
          `accounts[${this._account + 1}]`,
          this._account + 1
        ) : new AddressStatement(
          this.type,
          prng.uniqueId(),
          `accounts[${this._account - 1}]`,
          this._account - 1
        );
    } else {
      return <AddressStatement>(
        sampler.sampleArgument(depth, this.types)
      );
    }
  }

  copy(): AddressStatement {
    return new AddressStatement(
      this.type,
      this.uniqueId,
      this.value,
      this._account
    );
  }

  get account(): number {
    return this._account;
  }

  public toCode(): string {
    if (this.value.startsWith("0x"))
      return `const ${this.varName} = "${this.value}"`;

    return `const ${this.varName} = ${this.value}`;
  }

  public getValue(): string {
    if (this.value.startsWith("0x")) return `"${this.value}"`;

    return `${this.value}`;
  }
}
