/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
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

import { AddressStatement } from "../primitive/AddressStatement";
import { prng, Parameter } from "@syntest/framework";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { ActionStatement } from "./ActionStatement";
import { Statement } from "../Statement";

/**
 * @author Dimitri Stallenberg
 * @author Annibale Panichella
 */
export class ConstructorCall extends ActionStatement {
  get constructorName(): string {
    return this._constructorName;
  }

  private readonly _constructorName: string;
  private readonly _calls: ActionStatement[];
  private _sender: AddressStatement;

  /**
   * Constructor
   * @param types the return types of the constructor
   * @param uniqueId optional argument
   * @param constructorName the name of the constructor
   * @param args the arguments of the constructor
   * @param calls the methods calls of the constructor
   * @param sender the sender of the message
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    constructorName: string,
    args: Statement[],
    calls: ActionStatement[],
    sender: AddressStatement
  ) {
    super(types, uniqueId, args);
    this._constructorName = constructorName;
    this._calls = calls;
    this._sender = sender;
  }

  mutate(sampler: SoliditySampler, depth: number) {

    const args = [...this.args.map((a: Statement) => a.copy())];

    if (args.length > 0) {
      const index = prng.nextInt(0, args.length - 1);
      if (args[index] !== undefined)
        args[index] = args[index].mutate(sampler, depth + 1);
    }

    let calls = [...this.calls.map((a: ActionStatement) => a.copy())];

    let changed = false;
    if (
      prng.nextBoolean(1.0 / 3.0) &&
      calls.length > 1
    ) {
      calls = this.deleteMethodCall(calls);
      changed = true;
    }
    if (prng.nextBoolean(1.0 / 3.0)) {
      calls = this.replaceMethodCall(sampler, depth, calls);
      changed = true;
    }
    if (prng.nextBoolean(1.0 / 3.0)) {
      calls = this.addMethodCall(sampler, depth, calls);
      changed = true;
    }

    if (!this.calls.length) {
      calls = this.addMethodCall(sampler, depth, calls);
      changed = true;
    }

    if (!changed) {
      calls = this.replaceMethodCall(sampler, depth, calls);
      calls = this.addMethodCall(sampler, depth, calls);
    }

    return new ConstructorCall(this.types, this.id, this.constructorName, args, calls, this.sender.copy());
  }

  protected addMethodCall(sampler: SoliditySampler, depth: number, calls: ActionStatement[]): ActionStatement[] {
    let count = 0;
    while (prng.nextDouble(0, 1) <= Math.pow(0.5, count) && count < 10) {
      const index = prng.nextInt(0, calls.length);

      calls.splice(
        index,
        0,
        sampler.sampleObjectFunctionCall(depth + 1, this)
      );
      count++;
    }
    return calls
  }

  protected replaceMethodCall(sampler: SoliditySampler, depth: number, calls: ActionStatement[]): ActionStatement[] {
    if (calls.length) {
      const index = prng.nextInt(0, calls.length - 1);
      calls[index] = calls[index].mutate(sampler, depth + 1)
    }
    return calls
  }

  protected deleteMethodCall(calls: ActionStatement[]): ActionStatement[] {
    if (calls.length) {
      const index = prng.nextInt(0, calls.length - 1);
      calls.splice(index, 1);
    }
    return calls
  }

  copy() {
    const deepCopyArgs = [...this.args.map((a: Statement) => a.copy())];
    const deepCopyCalls = [
      ...this._calls.map((a: ActionStatement) => a.copy()),
    ];
    return new ConstructorCall(
      this.types,
      this.id,
      this.constructorName,
      deepCopyArgs,
      deepCopyCalls,
      this._sender.copy()
    );
  }


  get calls(): ActionStatement[] {
    return this._calls;
  }

  // TODO remove this
  addCall(call: ActionStatement) {
    this._calls.push(call)
  }

  get sender(): AddressStatement {
    return this._sender;
  }
}
