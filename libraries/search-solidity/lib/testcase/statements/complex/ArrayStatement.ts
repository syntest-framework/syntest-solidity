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
import { ArrayType, Parameter } from "@syntest/analysis-solidity";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { Decoding } from "../../../testbuilding/Decoding";
import { shouldNeverHappen } from "@syntest/search";

/**
 * Special statement specific to solidity contracts
 */
export class ArrayStatement extends Statement<ArrayType> {
  private _elements: Statement[]

  constructor(type: Parameter<ArrayType>, uniqueId: string, elements: Statement[]) {
    super(type, uniqueId, );
    this._elements = elements
  }

  copy() {
    return new ArrayStatement(this.type, this.uniqueId, this._elements.map((element) => element.copy()));
  }

  mutate(sampler: SoliditySampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      const children = this._elements.map((a: Statement) => a.copy());

      const choice = prng.nextDouble();

      if (children.length > 0) {
        if (choice < 0.33) {
          // 33% chance to add a child on this position
          const index = prng.nextInt(0, children.length);
          children.splice(
            index,
            0,
            sampler.sampleArgument(depth + 1, {
              name: `${index}`,
              type: this.type.type.baseType
            })
          );
        } else if (choice < 0.66) {
          // 33% chance to remove a child on this position
          const index = prng.nextInt(0, children.length - 1);
          children.splice(index, 1);
        } else {
          // 33% chance to mutate a child on this position
          const index = prng.nextInt(0, children.length - 1);
          children.splice(
            index,
            1,
            sampler.sampleArgument(depth + 1, {
              name: `${index}`,
              type: this.type.type.baseType
            })
          );
        }
      } else {
        // no children found so we always add
        children.push(
          sampler.sampleArgument(depth + 1, {
            name: `${0}`,
            type: this.type.type.baseType
          })
        );
      }

      return new ArrayStatement(
        this.type,
        prng.uniqueId(),
        children
      );
    } else {
      return sampler.sampleArgument(
        depth,
        this.type
      );

    }
  }

  override hasChildren(): boolean {
    // since every object function call has an instance there must be atleast one child
    return this._elements.length > 0;
  }

  override getChildren(): Statement[] {
    return [...this._elements];
  }

  setChild(index: number, newChild: Statement) {
    if (!newChild) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index >= this._elements.length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    this._elements[index] = newChild;
  }

  decode(context: ContextBuilder, exception: boolean): Decoding[] {
    const childNames = this._elements.map((a) => context.getOrCreateVariableName(a.type)).join(", ");

    const childDecodings: Decoding[] = this._elements.flatMap((a) => a.decode(context, exception))

    const decoded = `const ${context.getOrCreateVariableName(this.type)} = [${childNames}];`

    return [
      ...childDecodings,
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }
}
