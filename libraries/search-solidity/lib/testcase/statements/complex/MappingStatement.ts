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
import { Mapping, Parameter } from "@syntest/analysis-solidity";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { Decoding } from "../../../testbuilding/Decoding";
import { shouldNeverHappen } from "@syntest/search";

/**
 * Special statement specific to solidity contracts
 */
// TODO wrong could be other type then string!
type MappingType = {
  [key: string]: Statement | undefined;
};
export class MappingStatement extends Statement<Mapping> {
  private _mapping: MappingType;

  constructor(
    type: Parameter<Mapping>,
    uniqueId: string,
    mapping: MappingType
  ) {
    super(type, uniqueId);
    this._mapping = mapping;
  }

  mutate(sampler: SoliditySampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      // 80%
      const object: MappingType = {};

      const keys = Object.keys(this._mapping);

      if (keys.length === 0) {
        return new MappingStatement(this.type, prng.uniqueId(), object);
      }

      const availableKeys = [];
      for (const key of keys) {
        if (!this._mapping[key]) {
          object[key] = undefined;
          continue;
        }
        object[key] = this._mapping[key].copy();
        availableKeys.push(key);
      }

      const choice = prng.nextDouble();

      if (availableKeys.length > 0) {
        if (choice < 0.33) {
          // 33% chance to add a child on this position
          const index = prng.nextInt(0, keys.length - 1);
          const key = keys[index];
          object[key] = sampler.sampleArgument(depth + 1, {
            name: key,
            type: this.type.type.valueType,
          });
        } else if (choice < 0.66) {
          // 33% chance to remove a child on this position
          const key = prng.pickOne(availableKeys);
          object[key] = undefined;
        } else {
          // 33% chance to mutate a child
          const key = prng.pickOne(availableKeys);
          object[key] = object[key].mutate(sampler, depth + 1);
        }
      } else {
        // no keys available so we add one
        const index = prng.nextInt(0, keys.length - 1);
        const key = keys[index];
        object[key] = sampler.sampleArgument(depth + 1, {
          name: key,
          type: this.type.type.valueType,
        });
      }

      return new MappingStatement(this.type, prng.uniqueId(), object);
    } else {
      return sampler.sampleArgument(depth, this.type);
    }
  }

  copy() {
    const mapping: MappingType = {};

    for (const key of Object.keys(this._mapping)) {
      if (this._mapping[key] === undefined) {
        mapping[key] = undefined;
        continue;
      }
      if (this._mapping[key].uniqueId === this.uniqueId) {
        console.log("circular detected");
        mapping[key] = undefined;
        continue;
      }
      mapping[key] = this._mapping[key].copy();
    }

    return new MappingStatement(this.type, this.uniqueId, mapping);
  }

  getChildren(): Statement[] {
    return Object.keys(this._mapping)
      .sort()
      .filter((key) => this._mapping[key] !== undefined)
      .map((key) => this._mapping[key]);
  }

  hasChildren(): boolean {
    return this.getChildren().length > 0;
  }

  override setChild(index: number, child: Statement): void {
    if (!child) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index >= this.getChildren().length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    const keys = Object.keys(this._mapping)
      .sort()
      .filter((key) => this._mapping[key] !== undefined);
    const key = keys[index];

    this._mapping[key] = child;
  }

  decode(context: ContextBuilder, exception: boolean): Decoding[] {
    const childNames = Object.keys(this._mapping)
      .filter((key) => this._mapping[key] !== undefined)
      .map(
        (key) =>
          `\t\t\t"${key}": ${context.getOrCreateVariableName(
            this._mapping[key].type
          )}`
      )
      .join(",\n");

    const childDecodings: Decoding[] = Object.values(this._mapping)
      .filter((a) => a !== undefined)
      .flatMap((a) => a.decode(context, exception));

    const decoded = `const ${context.getOrCreateVariableName(
      this.type
    )} = {\n${childNames}\n\t\t}`;

    return [
      ...childDecodings,
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }
}
