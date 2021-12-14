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

import {
  ActionStatement,
  FunctionDescription,
  Parameter,
  prng,
  Properties,
  Statement,
} from "@syntest/framework";

import { SoliditySampler } from "./SoliditySampler";
import { AddressStatement } from "../statements/AddressStatement";
import BigNumber from "bignumber.js";
import { ByteStatement } from "../statements/ByteStatement";
import {
  SolidityParameter,
  SoliditySubject,
} from "../../search/SoliditySubject";
import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { StringStatement } from "../statements/primitive/StringStatement";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export class SolidityRandomSampler extends SoliditySampler {
  /**
   * Constructor
   */
  constructor(subject: SoliditySubject) {
    super(subject);
  }

  sample(): SolidityTestCase {
    const root = this.sampleConstructor(0);

    return new SolidityTestCase(root);
  }

  sampleObjectFunctionCall(
    depth: number,
    root: ConstructorCall
  ): ObjectFunctionCall {
    const actions = this._subject.getPossibleActions("function");

    // TODO make sure these actions are available on this root

    if (!actions.length) {
      throw new Error("There are no functions to test!");
    }

    const action = <FunctionDescription>prng.pickOne(actions);

    const args: Statement[] = [];

    for (const param of action.parameters) {
      if (param.type != "")
        args.push(
          this.sampleArgument(depth + 1, param, (<SolidityParameter>param).bits)
        );
    }

    const uniqueID = prng.uniqueId();
    // TODO not sure why this is needed
    // if (action.returnType == "") uniqueID = "var" + uniqueID;

    return new ObjectFunctionCall(
      action.returnParameters,
      uniqueID,
      root,
      action.name,
      args,
      AddressStatement.getRandom()
    );
  }

  sampleConstructor(depth: number): ConstructorCall {
    const constructors = this._subject.getPossibleActions("constructor");
    if (constructors.length > 0) {
      const action = <FunctionDescription>prng.pickOne(constructors);

      const args: Statement[] = [];
      for (const param of action.parameters) {
        if (param.type != "")
          args.push(
            this.sampleArgument(1, param, (<SolidityParameter>param).bits)
          );
      }

      const root = new ConstructorCall(
        [{ type: action.name, name: "contract" }],
        prng.uniqueId(),
        `${action.name}`,
        args,
        [],
        AddressStatement.getRandom()
      );

      const nCalls = prng.nextInt(1, 5);
      for (let index = 0; index <= nCalls; index++) {
        const call = this.sampleObjectFunctionCall(1, root);
        root.setMethodCall(index, call as ActionStatement);
      }

      // constructors do not have return parameters...
      return root;
    } else {
      // if no constructors is available, we invoke the default (implicit) constructor
      const root = new ConstructorCall(
        [{ type: this._subject.name, name: "contract" }],
        prng.uniqueId(),
        `${this._subject.name}`,
        [],
        [],
        AddressStatement.getRandom()
      );

      const nCalls = prng.nextInt(1, 5);
      for (let index = 0; index <= nCalls; index++) {
        const call = this.sampleObjectFunctionCall(1, root);
        root.setMethodCall(index, call as ActionStatement);
      }

      return root;
    }
  }

  sampleArgument(depth: number, type: Parameter, bits: number): Statement {
    // check depth to decide whether to pick a variable
    if (depth >= Properties.max_depth) {
      // TODO or take an already available variable
      if (type.type.includes("int")) {
        return this.sampleNumericGene(depth, type, bits);
      } else {
        return this.sampleStatement(depth, [type]);
      }
    }

    if (
      this._subject.getPossibleActions().filter((a) => a.type === type.type)
        .length &&
      prng.nextBoolean(Properties.sample_func_as_arg)
    ) {
      // Pick function
      // TODO or take an already available functionCall

      return this.sampleObjectFunctionCallTypeBased(depth, [type]);
    } else {
      // Pick variable
      // TODO or take an already available variable
      if (type.type.includes("int")) {
        return this.sampleNumericGene(depth, type, bits);
      } else {
        return this.sampleStatement(depth, [type]);
      }
    }
  }

  sampleNumericGene(depth: number, type: Parameter, bits: number): Statement {
    let max = new BigNumber(2).pow(bits - 1).minus(1);

    if (type.type.includes("uint")) {
      max = new BigNumber(2).pow(bits).minus(1);
      return NumericStatement.getRandom(type, 0, false, max, new BigNumber(0));
    } else {
      return NumericStatement.getRandom(type, 0, true, max, max.negated());
    }
    // TODO unreachable?
    if (type.type.includes("ufixed")) {
      return NumericStatement.getRandom(
        type,
        Properties.numeric_decimals,
        false
      );
    } else {
      return NumericStatement.getRandom(
        type,
        Properties.numeric_decimals,
        true
      );
    }
  }

  sampleStatement(
    depth: number,
    types: Parameter[],
    geneType = "primitive"
  ): Statement {
    if (geneType === "primitive") {
      if (types.length === 0) {
        throw new Error(
          "To sample a statement at least one type must be given!"
        );
      }

      if (types.length !== 1) {
        throw new Error(
          "Primitive can only have a single type, multiple where given."
        );
      }

      if (types[0].type === "bool") {
        return BoolStatement.getRandom(types[0]);
      } else if (types[0].type === "address") {
        return AddressStatement.getRandom(types[0]);
      } else if (types[0].type === "string") {
        return StringStatement.getRandom(types[0]);
      } else if (types[0].type.includes("string")) {
        return StringStatement.getRandom(types[0]);
      } else if (types[0].type.startsWith("byte")) {
        return this.sampleByteStatement(types[0]);
      } else if (types[0].type == "") {
        throw new Error(
          `Type "" not recognized. It must be a bug in our parser!`
        );
      }
    } else if (geneType === "functionCall") {
      return this.sampleObjectFunctionCallTypeBased(depth, types);
    } else if (geneType === "constructor") {
      return this.sampleConstructor(depth);
    }

    throw new Error(`Unknown types [${types.join(", ")}] ${geneType}!`);
  }

  sampleByteStatement(type: Parameter): ByteStatement {
    if (type.type === "byte" || type.type === "bytes1")
      return ByteStatement.getRandom(type, 1);
    else if (type.type === "bytes") {
      return ByteStatement.getRandom(type, prng.nextInt(1, 32));
    } else {
      const nBytes = type.type.replace("bytes", "");
      const n = Number.parseInt(nBytes);
      return ByteStatement.getRandom(type, n);
    }
  }

  sampleObjectFunctionCallTypeBased(
    depth: number,
    types: Parameter[]
  ): ObjectFunctionCall {
    const action = <FunctionDescription>(
      prng.pickOne(this._subject.getPossibleActions("function", types))
    );

    const args: Statement[] = [];

    for (const param of action.parameters) {
      if (param.type != "")
        args.push(
          this.sampleArgument(depth + 1, param, (<SolidityParameter>param).bits)
        );
    }

    const constructor = this.sampleConstructor(depth + 1);

    return new ObjectFunctionCall(
      action.returnParameters,
      prng.uniqueId(),
      constructor,
      action.name,
      args,
      AddressStatement.getRandom()
    );
  }
}
