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

import { prng } from "@syntest/framework";

/**
 * A pool with constants extracted from the subject under test.
 *
 * @author Mitchell Olsthoorn
 */
export class ConstantPool {
  private static instance: ConstantPool;

  protected addressPool = new Set<string>();
  protected numberPool = new Set<number>();
  protected stringPool = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(): ConstantPool {
    if (!ConstantPool.instance) {
      ConstantPool.instance = new ConstantPool();
    }

    return ConstantPool.instance;
  }

  addAddress(value: string): void {
    this.addressPool.add(value);
  }

  getAddress(): string {
    if (this.addressPool.size == 0) return null;

    return prng.pickOne(Array.from(this.addressPool));
  }

  addNumber(value: number): void {
    this.numberPool.add(value);
  }

  getNumber(): number {
    if (this.numberPool.size == 0) return null;

    return prng.pickOne(Array.from(this.numberPool));
  }

  addString(value: string): void {
    this.stringPool.add(value);
  }

  getString(): string {
    if (this.stringPool.size == 0) return null;

    return prng.pickOne(Array.from(this.stringPool));
  }
}
