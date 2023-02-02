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

import { CONFIG, prng } from "@syntest/core";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { Parameter } from "../../../analysis/static/parsing/Parameter";

/**
 * Special statement specific to solidity contracts
 * @author Annibale Panichella
 */
export class ByteStatement extends PrimitiveStatement<number[]> {
  private static _upper_bound = 32;
  private static _lower_bound = 0;

  constructor(type: Parameter, uniqueId: string, bytes: number[]) {
    super(type, uniqueId, bytes);
  }

  copy() {
    return new ByteStatement(this.type, prng.uniqueId(), [...this.value]);
  }

  mutate(): ByteStatement {
    if (prng.nextBoolean(CONFIG.deltaMutationProbability)) {
      const index = prng.nextInt(0, this.value.length - 1);

      const change = prng.nextGaussian(0, 3);
      const newBytes = [...this.value];

      const newValue = Math.round(newBytes[index] + change);
      newBytes[index] = Math.max(ByteStatement._lower_bound, newValue);
      newBytes[index] = Math.min(ByteStatement._upper_bound, newValue);

      return new ByteStatement(this.type, prng.uniqueId(), newBytes);
    }

    return ByteStatement.getRandom(this.type, this.value.length);
  }

  static getRandom(
    type: Parameter = { type: "byte", name: "noname" },
    nBytes = 1
  ) {
    const bytes: number[] = [];
    for (let index = 0; index < nBytes; index++) {
      bytes[index] = prng.nextInt(
        ByteStatement._lower_bound,
        ByteStatement._upper_bound
      );
    }

    return new ByteStatement(type, prng.uniqueId(), bytes);
  }
}
