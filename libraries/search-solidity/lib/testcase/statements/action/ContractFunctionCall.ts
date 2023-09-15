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
import { Parameter, FunctionType } from "@syntest/analysis-solidity";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { Decoding } from "../../../testbuilding/Decoding";
import { shouldNeverHappen } from "@syntest/search";

export class ContractFunctionCall extends ActionStatement<FunctionType> {
  private readonly _functionName: string;
  private _sender: AddressStatement;

  private _constructor: ConstructorCall;

  /**
   * Constructor
   * @param types the return types of the function
   * @param uniqueId id of the gene
   * @param constructor the object to call the function on
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    type: Parameter<FunctionType>,
    uniqueId: string,
    functionName: string,
    arguments_: Statement[],
    sender: AddressStatement,
    constructor: ConstructorCall
  ) {
    super(type, uniqueId, [...arguments_]);
    this._functionName = functionName;
    this._sender = sender;
    this._constructor = constructor;
  }

  mutate(sampler: SoliditySampler, depth: number): ContractFunctionCall {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      const arguments_ = this.arguments_.map((a: Statement) => a.copy());
      let constructor_ = this._constructor.copy()
      let sender = this._sender.copy()

      const index = prng.nextInt(0, arguments_.length + 1);

      if (index < arguments_.length) {
        arguments_[index] = arguments_[index].mutate(sampler, depth + 1);
      } else if (index === arguments_.length) {
        constructor_ = constructor_.mutate(sampler, depth + 1);
      } else {
        sender = <AddressStatement>sender.mutate(sampler, depth + 1)
      }

      return new ContractFunctionCall(
        this.type,
        this.uniqueId,
        this._functionName,
        arguments_,
        sender,
        constructor_
      );
    } else {
      // resample the gene
      return sampler.sampleContractFunctionCall(depth, this.type)
    }
  }

  copy() {
    const deepCopyArguments = this.arguments_.map((a: Statement) => a.copy());

    return new ContractFunctionCall(
      this.type,
      this.uniqueId,
      this._functionName,
      deepCopyArguments,
      this._sender.copy(),
      this._constructor.copy()
    );
  }

  override hasChildren(): boolean {
    // since every object function call has an instance there must be atleast one child
    return true;
  }

  override getChildren(): Statement[] {
    return [...this.arguments_, this._sender, this._constructor];
  }

  override setChild(index: number, newChild: Statement) {
    if (!newChild) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index > this.arguments_.length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    if (index === this.arguments_.length + 1) {
      if (!(newChild instanceof ConstructorCall)) {
        throw new TypeError(shouldNeverHappen("should be a constructor"));
      }
      this._constructor = newChild;
    } else if (index === this.arguments_.length) {
      if (!(newChild instanceof AddressStatement)) {
        throw new TypeError(shouldNeverHappen("should be a constructor"));
      }
      this._sender = newChild;
    } else {
      this.arguments_[index] = newChild;
    }
  }

  decode(context: ContextBuilder, exception: boolean): Decoding[] {
    const constructorName = context.getOrCreateVariableName(this._constructor.type)
    const senderName = context.getOrCreateVariableName(this._sender.type)
    const argumentNames = this.arguments_.map((a) => context.getOrCreateVariableName(a.type)).join(", ");

    const returnValues: string[] = this.type.type.returns.map((returnValue) => context.getOrCreateVariableName(returnValue))
    const senderString = argumentNames == "" ? `{ from: ${senderName} }` : `, { from: ${senderName} }`

    const constructorDecoding: Decoding[] = this._constructor.decode(context, exception)
    const senderDecoding: Decoding[] = this._sender.decode(context)
    const argumentDecodings: Decoding[] = this.arguments_.flatMap((a) => a.decode(context, exception))

    let decoded: string
    if (exception) {
      decoded = returnValues.length > 0 ? `await expect(${constructorName}.${this._functionName}.call(${argumentNames}${senderString})).to.be.rejectedWith(Error);` : `await expect(${constructorName}.${this._functionName}.call(${argumentNames}${senderString})).to.be.rejectedWith(Error);`;
    } else {
      decoded = returnValues.length > 0 ? `const [${returnValues.join(', ') }] = await ${constructorName}.${this._functionName}.call(${argumentNames}${senderString});` : `await ${constructorName}.${this._functionName}.call(${argumentNames}${senderString});`;
    }

    return [
      ...constructorDecoding,
      ...senderDecoding,
      ...argumentDecodings,
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }
}
