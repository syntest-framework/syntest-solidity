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

import { ConstructorCall } from "./ConstructorCall";
import { AddressStatement } from "../primitive/AddressStatement";

import { prng } from "@syntest/prng";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { ActionStatement } from "./ActionStatement";
import { Statement } from "../Statement";
import { Parameter } from "@syntest/analysis-solidity";
/**
 * @author Dimitri Stallenberg
 */
export class ObjectFunctionCall extends ActionStatement {
  private readonly _functionName: string;
  private _sender: AddressStatement;

  private readonly _parent: ConstructorCall;

  /**
   * Constructor
   * @param types the return types of the function
   * @param uniqueId id of the gene
   * @param instance the object to call the function on
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    instance: ConstructorCall,
    functionName: string,
    arguments_: Statement[],
    sender: AddressStatement
  ) {
    super(types, uniqueId, [...arguments_]);
    this._parent = instance;
    this._functionName = functionName;
    this._sender = sender;
  }

  mutate(sampler: SoliditySampler, depth: number): ObjectFunctionCall {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      const arguments_ = this.arguments_.map((a: Statement) => a.copy());
      if (arguments_.length === 0) return this;

      const index = prng.nextInt(0, arguments_.length - 1);
      arguments_[index] = arguments_[index].mutate(sampler, depth + 1);

      const instance = this._parent;
      return new ObjectFunctionCall(
        this.types,
        this.uniqueId,
        instance,
        this.functionName,
        arguments_,
        this._sender.copy()
      );
    } else {
      // resample the gene
      return <ObjectFunctionCall>(
        sampler.sampleStatement(depth, this.types, "functionCall")
      );
    }
  }

  copy() {
    const deepCopyArguments = this.arguments_.map((a: Statement) => a.copy());

    return new ObjectFunctionCall(
      this.types,
      this.uniqueId,
      this._parent,
      this.functionName,
      deepCopyArguments,
      this._sender.copy()
    );
  }

  hasChildren(): boolean {
    // since every object function call has an instance there must be atleast one child
    return true;
  }

  getChildren(): Statement[] {
    return [...this.arguments_];
  }

  getParent(): ConstructorCall {
    return this._parent;
  }

  get functionName(): string {
    return this._functionName;
  }

  setSender(sender: AddressStatement) {
    this._sender = sender;
  }

  getSender(): AddressStatement {
    return this._sender;
  }
}
