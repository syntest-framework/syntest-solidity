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

import { getUserInterface, Encoding, Decoder } from "@syntest/core";
import { ConstructorCall } from "./statements/action/ConstructorCall";
import { SoliditySampler } from "./sampling/SoliditySampler";

/**
 * SolidityTestCase class
 *
 * @author Dimitri Stallenberg
 * @author Mitchell Olsthoorn
 */
export class SolidityTestCase extends Encoding {
  private _root: ConstructorCall;

  /**
   * Constructor.
   *
   * @param root The root of the tree chromosome of the test case
   */
  constructor(root: ConstructorCall) {
    super();
    this._root = root;
  }

  mutate(sampler: SoliditySampler) {
    getUserInterface().debug(`Mutating test case: ${this._id}`);
    return new SolidityTestCase(
      (this._root as ConstructorCall).mutate(sampler, 0)
    );
  }

  hashCode(decoder: Decoder<Encoding, string>): number {
    const string = decoder.decode(this, `${this.id}`);
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      const character = string.charCodeAt(i);
      hash = (hash << 5) - hash + character;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  copy(): SolidityTestCase {
    return new SolidityTestCase(this.root.copy());
  }

  getLength(): number {
    return (this.root as ConstructorCall).getMethodCalls().length;
  }

  get root(): ConstructorCall {
    return this._root;
  }
}
