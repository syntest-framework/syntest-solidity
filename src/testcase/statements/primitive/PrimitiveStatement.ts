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

import { Statement } from "../Statement";
import { EncodingSampler } from "@syntest/core";
import { Parameter } from "../../../analysis/static/parsing/Parameter";
import { SolidityTestCase } from "../../SolidityTestCase";

/**
 * @author Dimitri Stallenberg
 */
export abstract class PrimitiveStatement<T> extends Statement {
  get type(): Parameter {
    return this.types[0];
  }

  get varName(): string {
    return this.varNames[0];
  }

  get value(): T {
    return this._value;
  }
  private _value: T;

  constructor(type: Parameter, uniqueId: string, value: T) {
    super([type], uniqueId);
    this._value = value;
  }

  abstract mutate(
    sampler: EncodingSampler<SolidityTestCase>,
    depth: number
  ): PrimitiveStatement<T>;

  abstract copy(): PrimitiveStatement<T>;

  hasChildren(): boolean {
    return false;
  }

  getChildren(): Statement[] {
    return [];
  }

  static getRandom() {
    throw new Error("Unimplemented function!");
  }
}
