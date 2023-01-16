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

import { prng, Properties } from "@syntest/core";
import { ConstantPool } from "../../../seeding/constant/ConstantPool";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { PrimitiveStatement } from "./PrimitiveStatement";
import { Parameter } from "../../../analysis/static/parsing/Parameter";

/**
 * @author Dimitri Stallenberg
 */
export class StringStatement extends PrimitiveStatement<string> {
  private readonly alphabet: string;
  private readonly maxlength: number;

  constructor(
    type: Parameter,
    uniqueId: string,
    value: string,
    alphabet: string,
    maxlength: number
  ) {
    super(type, uniqueId, value);
    this.alphabet = alphabet;
    this.maxlength = maxlength;
  }

  mutate(sampler: SoliditySampler, depth: number): StringStatement {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      return StringStatement.getRandom();
    }

    if (this.value.length > 0 && this.value.length < this.maxlength) {
      const value = prng.nextInt(0, 3);

      if (value === 0) {
        return this.addMutation();
      } else if (value === 1) {
        return this.removeMutation();
      } else if (value === 2) {
        return this.replaceMutation();
      } else {
        return this.deltaMutation();
      }
    } else if (this.value.length > 0) {
      const value = prng.nextInt(0, 2);

      if (value === 0) {
        return this.removeMutation();
      } else if (value === 1) {
        return this.replaceMutation();
      } else {
        return this.deltaMutation();
      }
    } else {
      return this.addMutation();
    }
  }

  addMutation(): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);
    const addedChar = prng.pickOne(this.alphabet.split(''));

    let newValue = "";

    for (let i = 0; i < this.value.length; i++) {
      if (i < position || i > position) {
        newValue += this.value[i];
      } else {
        newValue += addedChar;
        newValue += this.value[i];
      }
    }

    return new StringStatement(
      this.type,
      this.id,
      newValue,
      this.alphabet,
      this.maxlength
    );
  }

  removeMutation(): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);

    let newValue = "";

    for (let i = 0; i < this.value.length; i++) {
      if (i === position) {
        continue;
      }
      newValue += this.value[i];
    }

    return new StringStatement(
      this.type,
      this.id,
      newValue,
      this.alphabet,
      this.maxlength
    );
  }

  replaceMutation(): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);
    const newChar = prng.pickOne(this.alphabet.split(''));

    let newValue = "";

    for (let i = 0; i < this.value.length; i++) {
      if (i < position || i > position) {
        newValue += this.value[i];
      } else {
        newValue += newChar;
      }
    }

    return new StringStatement(
      this.type,
      this.id,
      newValue,
      this.alphabet,
      this.maxlength
    );
  }

  deltaMutation(): StringStatement {
    const position = prng.nextInt(0, this.value.length - 1);
    const oldChar = this.value[position];
    const indexOldChar = this.alphabet.indexOf(oldChar);
    const delta = prng.pickOne([-2, -1, 1, -2]);
    const newChar =
      this.alphabet[(indexOldChar + delta) % this.alphabet.length];

    let newValue = "";

    for (let i = 0; i < this.value.length; i++) {
      if (i < position || i > position) {
        newValue += this.value[i];
      } else {
        newValue += newChar;
      }
    }

    return new StringStatement(
      this.type,
      this.id,
      newValue,
      this.alphabet,
      this.maxlength
    );
  }

  copy(): StringStatement {
    return new StringStatement(
      this.type,
      this.id,
      this.value,
      this.alphabet,
      this.maxlength
    );
  }

  static getRandom(
    type: Parameter = { type: "string", name: "noname" },
    alphabet = Properties.string_alphabet,
    maxlength = Properties.string_maxlength
  ): StringStatement {
    if (
      Properties.constant_pool &&
      prng.nextDouble(0, 1) <= Properties.constant_pool_probability
    ) {
      const value = ConstantPool.getInstance().getString();
      if (value != null) return StringStatement.createWithValue(type, value);
    }

    const valueLength = prng.nextInt(0, maxlength - 1);
    let value = "";

    for (let i = 0; i < valueLength; i++) {
      value += prng.pickOne(alphabet.split(''));
    }

    return new StringStatement(
      type,
      prng.uniqueId(),
      value,
      alphabet,
      maxlength
    );
  }

  static createWithValue(type: Parameter, value: string): StringStatement {
    return new StringStatement(
      type,
      prng.uniqueId(),
      value,
      Properties.string_alphabet,
      Properties.string_maxlength
    );
  }
}
