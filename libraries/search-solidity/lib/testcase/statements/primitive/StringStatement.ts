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
import { StringType } from "@syntest/analysis-solidity";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { Decoding } from "../../../testbuilding/Decoding";

/**
 * String statement
 */
export class StringStatement extends PrimitiveStatement<string, StringType> {
  mutate(sampler: SoliditySampler, depth: number): Statement {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      if (
        this.value.length > 0 &&
        this.value.length < sampler.stringMaxLength
      ) {
        const value = prng.nextInt(0, 3);

        switch (value) {
          case 0: {
            return this.addMutation(sampler);
          }
          case 1: {
            return this.removeMutation();
          }
          case 2: {
            return this.replaceMutation(sampler);
          }
          default: {
            return this.deltaMutation(sampler);
          }
        }
      } else if (this.value.length > 0) {
        const value = prng.nextInt(0, 2);

        if (value === 0) {
          return this.removeMutation();
        } else if (value === 1) {
          return this.replaceMutation(sampler);
        } else {
          return this.deltaMutation(sampler);
        }
      } else {
        return this.addMutation(sampler);
      }
    } else {
      return sampler.sampleArgument(depth, this.type);
    }
  }

  addMutation(sampler: SoliditySampler): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);
    const addedChar = prng.pickOne([...sampler.stringAlphabet]);

    let newValue = "";

    for (let index = 0; index < this.value.length; index++) {
      if (index < position || index > position) {
        newValue += this.value[index];
      } else {
        newValue += addedChar;
        newValue += this.value[index];
      }
    }

    return new StringStatement(this.type, this.uniqueId, newValue);
  }

  removeMutation(): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);

    let newValue = "";

    for (let index = 0; index < this.value.length; index++) {
      if (index === position) {
        continue;
      }
      newValue += this.value[index];
    }

    return new StringStatement(this.type, this.uniqueId, newValue);
  }

  replaceMutation(sampler: SoliditySampler): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);
    const newChar = prng.pickOne([...sampler.stringAlphabet]);

    let newValue = "";

    for (let index = 0; index < this.value.length; index++) {
      newValue +=
        index < position || index > position ? this.value[index] : newChar;
    }

    return new StringStatement(this.type, this.uniqueId, newValue);
  }

  deltaMutation(sampler: SoliditySampler): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);
    const oldChar = this.value[position];
    const indexOldChar = sampler.stringAlphabet.indexOf(oldChar);
    const delta = prng.pickOne([-2, -1, 1, -2]);
    const newChar =
      sampler.stringAlphabet[
        (indexOldChar + delta) % sampler.stringAlphabet.length
      ];

    let newValue = "";

    for (let index = 0; index < this.value.length; index++) {
      newValue +=
        index < position || index > position ? this.value[index] : newChar;
    }

    return new StringStatement(this.type, this.uniqueId, newValue);
  }

  copy(): StringStatement {
    return new StringStatement(this.type, this.uniqueId, this.value);
  }

  override decode(context: ContextBuilder): Decoding[] {
    let value = this.value;

    value = value.replaceAll(/\\/g, "\\\\");
    value = value.replaceAll(/\n/g, "\\n");
    value = value.replaceAll(/\r/g, "\\r");
    value = value.replaceAll(/\t/g, "\\t");
    value = value.replaceAll(/"/g, '\\"');

    return [
      {
        decoded: `const ${context.getOrCreateVariableName(
          this,
          this.type
        )} = "${value}";`,
        reference: this,
      },
    ];
  }
}
