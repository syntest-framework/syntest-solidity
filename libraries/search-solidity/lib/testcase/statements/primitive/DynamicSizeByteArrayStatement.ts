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
import { PrimitiveStatement } from "./PrimitiveStatement";
import { DynamicSizeByteArray, Parameter } from "@syntest/analysis-solidity";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import * as web3_utils from "web3-utils";
import { Decoding } from "../../../testbuilding/Decoding";

/**
 * Special statement specific to solidity contracts
 */
export class DynamicSizeByteArrayStatement extends PrimitiveStatement<
  number[],
  DynamicSizeByteArray
> {
  public static upper_bound = 256;
  public static lower_bound = 0;

  constructor(
    type: Parameter<DynamicSizeByteArray>,
    uniqueId: string,
    bytes: number[]
  ) {
    super(type, uniqueId, bytes);
  }

  copy() {
    return new DynamicSizeByteArrayStatement(this.type, prng.uniqueId(), [
      ...this.value,
    ]);
  }

  mutate(sampler: SoliditySampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      const index = prng.nextInt(0, this.value.length - 1);

      const change = prng.nextGaussian(0, 3);
      const newBytes = [...this.value];

      const newValue = Math.round(newBytes[index] + change);
      newBytes[index] = Math.max(
        DynamicSizeByteArrayStatement.lower_bound,
        newValue
      );
      newBytes[index] = Math.min(
        DynamicSizeByteArrayStatement.upper_bound,
        newValue
      );

      return new DynamicSizeByteArrayStatement(
        this.type,
        prng.uniqueId(),
        newBytes
      );
    } else {
      return sampler.sampleArgument(depth, this.type);
    }
  }

  decode(context: ContextBuilder): Decoding[] {
    const bytes = web3_utils.bytesToHex(this.value);

    return [
      {
        decoded: `const ${context.getOrCreateVariableName(
          this.type
        )} = "${bytes}";`,
        reference: this,
      },
    ];
  }
}
