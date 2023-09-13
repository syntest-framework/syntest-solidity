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

import { CONFIG, prng } from "@syntest/search";
import { Parameter } from "../../../analysis/static/parsing/Parameter";
import { PrimitiveStatement } from "./PrimitiveStatement";

/**
 * @author Dimitri Stallenberg
 */
export class BoolStatement extends PrimitiveStatement<boolean> {
  constructor(type: Parameter, uniqueId: string, value: boolean) {
    super(type, uniqueId, value);
  }

  mutate() {
    if (prng.nextBoolean(CONFIG.resampleGeneProbability)) {
      return BoolStatement.getRandom(this.type);
    }

    return new BoolStatement(this.type, this.id, !this.value);
  }

  copy() {
    return new BoolStatement(this.type, this.id, this.value);
  }

  static getRandom(
    type: Parameter = { type: "bool", name: "noname" }
  ): BoolStatement {
    return new BoolStatement(type, prng.uniqueId(), prng.nextBoolean());
  }
}
