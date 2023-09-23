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

import { AddressStatement } from "../primitive/AddressStatement";
import { prng } from "@syntest/prng";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { ActionStatement } from "./ActionStatement";
import { Statement } from "../Statement";
import { Contract, Parameter } from "@syntest/analysis-solidity";
import { ContextBuilder } from "../../../testbuilding/ContextBuilder";
import { Decoding } from "../../../testbuilding/Decoding";
import { shouldNeverHappen } from "@syntest/search";

/**
 * ConstructorCall
 */
export class ConstructorCall extends ActionStatement<Contract> {
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
    type: Parameter<Contract>,
    uniqueId: string,
    arguments_: Statement[],
    sender: AddressStatement
  ) {
    super(type, uniqueId, arguments_);
    this._sender = sender;
  }

  mutate(sampler: SoliditySampler, depth: number) {
    if (sampler.deltaMutationProbability) {
      const arguments_ = this.arguments_.map((a: Statement) => a.copy());
      let sender = this._sender.copy();

      if (arguments_.length > 0) {
        const index = prng.nextInt(0, arguments_.length + 1);
        if (arguments_[index] === undefined) {
          sender = <AddressStatement>sender.mutate(sampler, depth + 1);
        } else {
          arguments_[index] = arguments_[index].mutate(sampler, depth + 1);
        }
      } else {
        sender = <AddressStatement>sender.mutate(sampler, depth + 1);
      }

      return new ConstructorCall(
        this.type,
        prng.uniqueId(),
        this.arguments_,
        sender
      );
    } else {
      return sampler.sampleConstructorCall(depth, this.type);
    }
  }

  copy() {
    const deepCopyArguments = this.arguments_.map((a: Statement) => a.copy());
    return new ConstructorCall(
      this.type,
      this.uniqueId,
      deepCopyArguments,
      this._sender.copy()
    );
  }

  override hasChildren(): boolean {
    // since every object function call has an instance there must be atleast one child
    return true;
  }

  override getChildren(): Statement[] {
    return [...this.arguments_, this._sender];
  }

  override setChild(index: number, newChild: Statement) {
    if (!newChild) {
      throw new Error("Invalid new child!");
    }

    if (index < 0 || index > this.arguments_.length) {
      throw new Error(shouldNeverHappen(`Invalid index used index: ${index}`));
    }

    if (index === this.arguments_.length) {
      if (!(newChild instanceof AddressStatement)) {
        throw new TypeError(shouldNeverHappen("should be a constructor"));
      }
      this._sender = newChild;
    } else {
      this.arguments_[index] = newChild;
    }
  }

  decode(context: ContextBuilder): Decoding[] {
    const importName = context.getOrCreateImportName(this.type);
    const senderDecoding: Decoding[] = this._sender.decode(context);
    const argumentDecodings: Decoding[] = this.arguments_.flatMap((a) =>
      a.decode(context)
    );

    const senderName = context.getOrCreateVariableName(
      this._sender,
      this._sender.type
    );
    const argumentNames = this.arguments_
      .map((a) => context.getOrCreateVariableName(a, a.type))
      .join(", ");

    const senderString =
      argumentNames == ""
        ? `{ from: ${senderName} }`
        : `, { from: ${senderName} }`;

    const decoded = `const ${context.getOrCreateVariableName(
      this,
      this.type
    )} = await ${importName}.new(${argumentNames}${senderString});`;

    return [
      ...senderDecoding,
      ...argumentDecodings,
      {
        decoded: decoded,
        reference: this,
      },
    ];
  }
}
