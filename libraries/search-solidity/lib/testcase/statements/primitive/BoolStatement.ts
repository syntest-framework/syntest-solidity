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
import { Bool, Parameter } from "@syntest/analysis-solidity";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { Decoding } from "../../../testbuilding/Decoding";

/**
 * @author Dimitri Stallenberg
 */
export class BoolStatement extends PrimitiveStatement<boolean, Bool> {
  constructor(type: Parameter<Bool>, uniqueId: string, value: boolean) {
    super(type, uniqueId, value);
  }

  mutate(sampler: SoliditySampler, depth: number): Statement {
    return prng.nextBoolean(sampler.deltaMutationProbability)
      ? new BoolStatement(this.type, this.uniqueId, !this.value)
      : sampler.sampleArgument(depth, this.type);
  }

  copy() {
    return new BoolStatement(this.type, this.uniqueId, this.value);
  }

  decode(context: ContextBuilder): Decoding[] {
    return [
      {
        decoded: `const ${context.getOrCreateVariableName(this, this.type)} = ${
          this.value
        };`,
        reference: this,
      },
    ];
  }
}
