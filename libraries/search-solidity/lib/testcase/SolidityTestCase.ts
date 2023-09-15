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

import { Encoding, Decoder } from "@syntest/search";
import { SoliditySampler } from "./sampling/SoliditySampler";
import { Logger, getLogger } from "@syntest/logging";
import { ActionStatement } from "./statements/action/ActionStatement";
import { prng } from "@syntest/prng";
import { StatementPool } from "./StatementPool";
/**
 * SolidityTestCase class
 *
 * @author Dimitri Stallenberg
 * @author Mitchell Olsthoorn
 */
export class SolidityTestCase extends Encoding {
  protected static LOGGER: Logger;

  private _roots: ActionStatement[];

  private _statementPool: StatementPool;

  /**
   * Constructor.
   *
   * @param root The root of the tree chromosome of the test case
   */
  constructor(roots: ActionStatement[]) {
    super();
    SolidityTestCase.LOGGER = getLogger("SolidityTestCase");
   
    this._roots = roots.map((value) => value.copy());

    if (roots.length === 0) {
      throw new Error("Requires atleast one root action statement");
    }

    this._statementPool = new StatementPool(roots);

  }

  mutate(sampler: SoliditySampler) {
    SolidityTestCase.LOGGER.debug(`Mutating test case: ${this._id}`);

    sampler.statementPool = this._statementPool;
    const roots = this._roots.map((action) => action.copy());

    const choice = prng.nextDouble();

    if (roots.length > 1) {
      if (choice < 0.33) {
        // 33% chance to add a root on this position
        const index = prng.nextInt(0, roots.length);
        roots.splice(index, 0, sampler.sampleRoot());
      } else if (choice < 0.66) {
        // 33% chance to delete the root
        const index = prng.nextInt(0, roots.length - 1);
        roots.splice(index, 1);
      } else {
        // 33% chance to just mutate the root
        const index = prng.nextInt(0, roots.length - 1);
        roots.splice(index, 1, roots[index].mutate(sampler, 1));
      }
    } else {
      if (choice < 0.5) {
        // 50% chance to add a root on this position
        const index = prng.nextInt(0, roots.length);
        roots.splice(index, 0, sampler.sampleRoot());
      } else {
        // 50% chance to just mutate the root
        const index = prng.nextInt(0, roots.length - 1);
        roots.splice(index, 1, roots[index].mutate(sampler, 1));
      }
    }

    sampler.statementPool = undefined;

    return new SolidityTestCase(roots);
  }

  hashCode(decoder: Decoder<Encoding, string>): number {
    const string = decoder.decode(this, `${this.id}`);
    let hash = 0;
    for (let index = 0; index < string.length; index++) {
      const character = string.codePointAt(index);
      hash = (hash << 5) - hash + character;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  copy(): SolidityTestCase {
    return new SolidityTestCase(this._roots.map((root) => root.copy()))
  }

  getLength(): number {
    return this._roots.length;
  }

  get roots(): ActionStatement[] {
    return this._roots.map((value) => value.copy());
  }
}
