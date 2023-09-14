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
import { PrimitiveStatement } from "../primitive/PrimitiveStatement";
import { Parameter } from "@syntest/analysis-solidity";

/**
 * Special statement specific to solidity contracts
 */
export class ArrayStatement extends PrimitiveStatement<number[]> {
  private static _upper_bound = 32;
  private static _lower_bound = 0;

  constructor(type: Parameter, uniqueId: string, bytes: number[]) {
    super(type, uniqueId, bytes);
  }

  copy() {
    return new ArrayStatement(this.type, prng.uniqueId(), [...this.value]);
  }

  mutate(sampler: SoliditySampler): ArrayStatement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      const index = prng.nextInt(0, this.value.length - 1);

      const change = prng.nextGaussian(0, 3);
      const newBytes = [...this.value];

      const newValue = Math.round(newBytes[index] + change);
      newBytes[index] = Math.max(ArrayStatement._lower_bound, newValue);
      newBytes[index] = Math.min(ArrayStatement._upper_bound, newValue);

      return new ArrayStatement(this.type, prng.uniqueId(), newBytes);
    } else {
      return ArrayStatement.getRandom(this.type, this.value.length);
    }
  }

  static getRandom(
    type: Parameter = { type: "byte", name: "noname" },
    nBytes = 1
  ) {
    const bytes: number[] = [];
    for (let index = 0; index < nBytes; index++) {
      bytes[index] = prng.nextInt(
        ArrayStatement._lower_bound,
        ArrayStatement._upper_bound
      );
    }

    return new ArrayStatement(type, prng.uniqueId(), bytes);
  }
}
