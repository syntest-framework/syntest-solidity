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
    if (this.args.length > 0) {
      const args = [...this.args.map((a: Statement) => a.copy())];
      const index = prng.nextInt(0, args.length - 1);
      if (args[index] !== undefined)
        args[index] = args[index].mutate(sampler, depth + 1);
    }

    let changed = false;
    if (
      prng.nextDouble(0, 1) <= 1.0 / 3.0 &&
      this.getMethodCalls().length > 1
    ) {
      this.deleteMethodCall();
      changed = true;
    }
    if (prng.nextDouble(0, 1) <= 1.0 / 3.0) {
      this.replaceMethodCall(sampler, depth);
      changed = true;
    }
    if (prng.nextDouble(0, 1) <= 1.0 / 3.0) {
      this.addMethodCall(sampler, depth);
      changed = true;
    }

    if (!this.hasMethodCalls()) {
      this.addMethodCall(sampler, depth);
      changed = true;
    }

    if (!changed) {
      this.replaceMethodCall(sampler, depth);
      this.addMethodCall(sampler, depth);
    }

    return this;
  }

  protected addMethodCall(sampler: SoliditySampler, depth: number) {
    let count = 0;
    while (prng.nextDouble(0, 1) <= Math.pow(0.5, count) && count < 10) {
      const index = prng.nextInt(0, this._calls.length);

      this._calls.splice(
        index,
        0,
        sampler.sampleObjectFunctionCall(depth + 1, this)
      );
      count++;
    }
  }

  protected replaceMethodCall(sampler: SoliditySampler, depth: number) {
    if (this.hasMethodCalls()) {
      const calls = this.getMethodCalls();
      const index = prng.nextInt(0, calls.length - 1);
      this.setMethodCall(index, calls[index].mutate(sampler, depth));
    }
  }

  protected deleteMethodCall() {
    if (this.hasMethodCalls()) {
      const calls = this.getMethodCalls();
      const index = prng.nextInt(0, calls.length - 1);
      this._calls.splice(index, 1);
    }
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

  getMethodCalls(): ActionStatement[] {
    return [...this._calls];
  }

  setMethodCall(index: number, call: ActionStatement) {
    this._calls[index] = call;
  }

  hasMethodCalls(): boolean {
    return this._calls.length > 0;
  }

  setSender(sender: AddressStatement) {
    this._sender = sender;
  }

  getSender(): AddressStatement {
    return this._sender;
  }
}
