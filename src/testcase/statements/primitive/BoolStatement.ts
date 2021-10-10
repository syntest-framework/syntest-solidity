/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
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

import { PrimitiveStatement } from "syntest-framework/dist/testcase/statements/PrimitiveStatement";
import { TestCaseSampler } from "syntest-framework/dist/testcase/sampling/TestCaseSampler";
import { prng } from "syntest-framework/dist/util/prng";
import { Properties } from "syntest-framework/dist/properties";
import { Parameter } from "syntest-framework";

/**
 * @author Dimitri Stallenberg
 */
export class BoolStatement extends PrimitiveStatement<boolean> {
  constructor(type: Parameter, uniqueId: string, value: boolean) {
    super(type, uniqueId, value);
  }

  mutate(sampler: TestCaseSampler, depth: number) {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return BoolStatement.getRandom(this.type);
    }

    return new BoolStatement(this.type, this.id, !this.value);
  }

  copy() {
    return new BoolStatement(this.type, this.id, this.value);
  }

  static getRandom(
    type: Parameter = { type: "bool", name: "noname" }
  ): PrimitiveStatement<any> {
    return new BoolStatement(type, prng.uniqueId(), prng.nextBoolean());
  }
}
