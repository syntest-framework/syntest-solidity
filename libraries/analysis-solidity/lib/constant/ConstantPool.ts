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

/**
 * A pool with constants extracted from the subject under test.
 */
export class ConstantPool {

  protected _numericPool: Map<number, number>;
  protected _integerPool: Map<number, number>;
  protected _stringPool: Map<string, number>;
  protected _addressPool: Map<string, number>;

  protected _numericCount: number;
  protected _integerCount: number;
  protected _stringCount: number;
  protected _addressCount: number;


  constructor() {
    this._numericPool = new Map()
    this.addNumeric(Math.PI);
    this.addNumeric(Math.E);

    this._integerPool = new Map()
    this._stringPool = new Map()
    this._addressPool = new Map()


  }

  addNumeric(value: number): void {
    if (this._numericPool.has(value)) {
      this._numericPool.set(value, this._numericPool.get(value) + 1);
    } else {
      this._numericPool.set(value, 1);
    }
    this._numericCount++;
  }

  addInteger(value: number): void {
    if (this._integerPool.has(value)) {
      this._integerPool.set(value, this._integerPool.get(value) + 1);
    } else {
      this._integerPool.set(value, 1);
    }
    this._integerCount++;
  }
  
  addString(value: string): void {
    if (this._stringPool.has(value)) {
      this._stringPool.set(value, this._stringPool.get(value) + 1);
    } else {
      this._stringPool.set(value, 1);
    }
    this._stringCount++;
  }

  addAddress(value: string): void {
    if (this._addressPool.has(value)) {
      this._addressPool.set(value, this._addressPool.get(value) + 1);
    } else {
      this._addressPool.set(value, 1);
    }
    this._addressCount++;
  }


  public getRandomNumeric(frequencyBased = false): number {
    if (this._numericPool.size === 0) {
      return undefined;
    }

    if (frequencyBased) {
      let index = prng.nextDouble() * this._numericCount;
      for (const [value, frequency] of this._numericPool.entries()) {
        if (index >= frequency) {
          return value;
        } else {
          index -= frequency;
        }
      }
      return prng.pickOne([...this._numericPool.keys()]);
    } else {
      return prng.pickOne([...this._numericPool.keys()]);
    }
  }

  public getRandomInteger(frequencyBased = false): number {
    if (this._integerPool.size === 0) {
      return undefined;
    }

    if (frequencyBased) {
      let index = prng.nextDouble() * this._integerCount;
      for (const [value, frequency] of this._integerPool.entries()) {
        if (index >= frequency) {
          return value;
        } else {
          index -= frequency;
        }
      }
      return prng.pickOne([...this._integerPool.keys()]);
    } else {
      return prng.pickOne([...this._integerPool.keys()]);
    }
  }

  public getRandomAdress(frequencyBased = false): string {
    if (this._addressPool.size === 0) {
      return undefined;
    }

    if (frequencyBased) {
      let index = prng.nextDouble() * this._addressCount;
      for (const [value, frequency] of this._addressPool.entries()) {
        if (index >= frequency) {
          return value;
        } else {
          index -= frequency;
        }
      }
      return prng.pickOne([...this._addressPool.keys()]);
    } else {
      return prng.pickOne([...this._addressPool.keys()]);
    }
  }

  public getRandomString(frequencyBased = false): string {
    if (this._stringPool.size === 0) {
      return undefined;
    }

    if (frequencyBased) {
      let index = prng.nextDouble() * this._stringCount;
      for (const [value, frequency] of this._stringPool.entries()) {
        if (index >= frequency) {
          return value;
        } else {
          index -= frequency;
        }
      }
      return prng.pickOne([...this._stringPool.keys()]);
    } else {
      return prng.pickOne([...this._stringPool.keys()]);
    }
  }
}
