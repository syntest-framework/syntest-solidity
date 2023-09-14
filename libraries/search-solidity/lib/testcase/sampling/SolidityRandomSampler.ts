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

import { SoliditySampler } from "./SoliditySampler";
import { AddressStatement } from "../statements/primitive/AddressStatement";
import BigNumber from "bignumber.js";
import { ArrayStatement } from "../statements/complex/ArrayStatement";
import {
  SoliditySubject,
} from "../../search/SoliditySubject";
import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { StringStatement } from "../statements/primitive/StringStatement";
import { Statement } from "../statements/Statement";
import { ActionStatement } from "../statements/action/ActionStatement";
import { Address, Bool, ConstantPool, DynamicSizeByteArray, Fixed, FixedSizeByteArray, Int, Parameter, StringType, TypeEnum, Ufixed, Uint, Visibility } from "@syntest/analysis-solidity";
import { TargetType } from "@syntest/analysis";
import { FunctionTarget } from "@syntest/analysis-solidity";
import { IntegerStatement } from "../statements/primitive/IntegerStatement";
import { DynamicSizeByteArrayStatement } from "../statements/complex/DynamicSizeByteArrayStatement";
import { FixedSizeByteArrayStatement } from "../statements/complex/FixedSizeByteArrayStatement";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export class SolidityRandomSampler extends SoliditySampler {
  /**
   * Constructor
   */
  constructor(
    subject: SoliditySubject,
    constantPool: ConstantPool,
    constantPoolEnabled: boolean,
    constantPoolProbability: number,
    statementPoolEnabled: boolean,
    statementPoolProbability: number,
    maxActionStatements: number,
    stringAlphabet: string,
    stringMaxLength: number,
    deltaMutationProbability: number,
    exploreIllegalValues: boolean,
    numericDecimals: number
  ) {
    super(
      subject,
      constantPool,
      constantPoolEnabled,
      constantPoolProbability,
      statementPoolEnabled,
      statementPoolProbability,
      maxActionStatements,
      stringAlphabet,
      stringMaxLength,
      deltaMutationProbability,
      exploreIllegalValues,
      numericDecimals
    )
  }

  sample(): SolidityTestCase {
    const root = this.sampleConstructor(0);

    return new SolidityTestCase(root);
  }

  sampleContractFunction(
    depth: number,
    root: ConstructorCall
  ): ObjectFunctionCall {
    const actions = (<SoliditySubject>this._subject).getActionableTargetsByType(TargetType.FUNCTION).filter((x) => (<FunctionTarget>x).name !== 'constructor')

    // TODO make sure these actions are available on this root

    if (actions.length === 0) {
      throw new Error("There are no functions to test!");
    }

    const action = <FunctionTarget>prng.pickOne(actions);

    const arguments_: Statement[] = [];

    for (const parameter of action.parameters) {
      arguments_.push(
        this.sampleArgument(depth + 1, parameter)
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
      arguments_,
      AddressStatement.getRandom()
    );
  }

  sampleConstructor(depth: number): ConstructorCall {
    const constructors = (<SoliditySubject>this._subject).getActionableTargetsByType(TargetType.FUNCTION).filter((x) => (<FunctionTarget>x).name === 'constructor')

    if (constructors.length > 0) {
      const action = <FunctionTarget>prng.pickOne(constructors);

      const arguments_: Statement[] = [];
      for (const parameter of action.parameters) {
        arguments_.push(
          this.sampleArgument(1, parameter)
        );
      }

      const root = new ConstructorCall(
        [{ type: action.name, name: "contract" }],
        prng.uniqueId(),
        `${action.name}`,
        arguments_,
        [],
        AddressStatement.getRandom()
      );

      const nCalls = prng.nextInt(1, 5);
      for (let index = 0; index <= nCalls; index++) {
        const call = this.sampleContractFunction(depth + 1, root);
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
        const call = this.sampleContractFunction(depth + 1, root);
        root.setMethodCall(index, call as ActionStatement);
      }

      return root;
    }
  }

  sampleArgument(depth: number, type: Parameter): Statement {
    switch (type.type.type) {
    case TypeEnum.ADDRESS: {
      return this.sampleAddressStatement(depth, <Parameter<Address>>type)
    }
    case TypeEnum.BOOL: {
      return this.sampleBoolStatement(depth, <Parameter<Bool>>type)
    }
    case TypeEnum.INT: {
      return this.sampleIntegerStatement(depth, <Parameter<Int | Uint>>type)
    }
    case TypeEnum.FIXED: {
      return this.sampleNumericStatement(depth, <Parameter<Fixed | Ufixed>>type)
    }
    case TypeEnum.FIXED_SIZE_BYTE_ARRAY: {
      return this.sampleFixedSizeByteArrayStatement(depth, <Parameter<FixedSizeByteArray>>type)
    }
    case TypeEnum.DYNAMIC_SIZE_BYTE_ARRAY: {
      return this.sampleDynamicSizeByteArrayStatement(depth,<Parameter<DynamicSizeByteArray>>type)
    }
    case TypeEnum.STRING: {
      return this.sampleStringStatement(depth, <Parameter<StringType>>type)
    }
    case TypeEnum.CONTRACT: {
      throw new Error("TODO contract types")
      // return this.sampleStringStatement(depth, type)
    }
    case TypeEnum.USER_DEFINED: {
      throw new Error("TODO user defined types")
      // return this.sampleStringStatement(depth, type)
    }
    case TypeEnum.FUNCTION: {
      throw new Error("TODO function types")
      // return this.sampleStringStatement(depth, type)
    }
    case TypeEnum.MAPPING: {
      throw new Error("TODO mapping types")
      // return this.sampleStringStatement(depth, type)
    }
    case TypeEnum.ARRAY: {
      throw new Error("TODO array types")
      // return this.sampleStringStatement(depth, type)
    }
    }
  }

  sampleAddressStatement(depth: number, type: Parameter<Address>): AddressStatement {
    let address: string
    let account: number
    if (this.constantPoolEnabled && prng.nextBoolean(this.constantPoolProbability)) {
      address = this.constantPool.getRandomAdress()
      account = -1
    } else {
      account = prng.nextInt(-1, 5);
      address = account < 0 ? "0x".concat((-account).toString(16).padStart(40, "0")) : `accounts[${account}]`;
    }

    return new AddressStatement(type, prng.uniqueId(), address, account)
  }

  sampleBoolStatement(depth: number, type: Parameter<Bool>): BoolStatement {
    return new BoolStatement(type, prng.uniqueId(), prng.nextBoolean())
  }

  sampleIntegerStatement(depth: number, type: Parameter<Int | Uint>): IntegerStatement {
    let value: BigNumber
    if (this.constantPoolEnabled && prng.nextBoolean(this.constantPoolProbability)) {
      value = new BigNumber(this.constantPool.getRandomInteger())
    } else if (type.type.signed) {
      const upper_bound = new BigNumber(2).pow(type.type.bits - 1).minus(1);
      const max = BigNumber.min(upper_bound, new BigNumber(Math.pow(2, 11) - 1));
      const min: BigNumber = max.negated()
      value = prng.nextBigDouble(min, max)
    } else {
      const upper_bound = new BigNumber(2).pow(type.type.bits).minus(1);
      const max = BigNumber.min(upper_bound, new BigNumber(Math.pow(2, 11) - 1));
      const min: BigNumber = new BigNumber(0);
      value = prng.nextBigDouble(min, max)
    }
    return new IntegerStatement(type, prng.uniqueId(), value)

  }

  sampleNumericStatement(depth: number, type: Parameter<Fixed | Ufixed>): NumericStatement {
    let value: BigNumber
    if (this.constantPoolEnabled && prng.nextBoolean(this.constantPoolProbability)) {
      value = new BigNumber(this.constantPool.getRandomNumeric())
    } else if (type.type.signed) {
      const upper_bound = new BigNumber(2).pow(type.type.bits - 1).minus(1);
      const max = BigNumber.min(upper_bound, new BigNumber(Math.pow(2, 11) - 1));
      const min: BigNumber = max.negated()
      value = prng.nextBigDouble(min, max)
    } else {
      const upper_bound = new BigNumber(2).pow(type.type.bits).minus(1);
      const max = BigNumber.min(upper_bound, new BigNumber(Math.pow(2, 11) - 1));
      const min: BigNumber = new BigNumber(0);
      value = prng.nextBigDouble(min, max)
    }
    return new NumericStatement(type, prng.uniqueId(), value)
  }

  sampleFixedSizeByteArrayStatement(depth: number, type: Parameter<FixedSizeByteArray>): FixedSizeByteArrayStatement {
    const bytes: number[] = [];
    for (let index = 0; index < type.type.bytes; index++) {
      bytes[index] = prng.nextInt(
        FixedSizeByteArrayStatement.lower_bound,
        FixedSizeByteArrayStatement.upper_bound
      );
    }
    return new FixedSizeByteArrayStatement(type, prng.uniqueId(), bytes)
  }

  sampleDynamicSizeByteArrayStatement(depth: number, type: Parameter<DynamicSizeByteArray>): DynamicSizeByteArrayStatement {
    const min = 1
    const max = 32

    const bytes: number[] = [];
    for (let index = 0; index < prng.nextInt(min, max); index++) {
      bytes[index] = prng.nextInt(
        DynamicSizeByteArrayStatement.lower_bound,
        DynamicSizeByteArrayStatement.upper_bound
      );
    }

    return new DynamicSizeByteArrayStatement(type, prng.uniqueId(), bytes)
  }

  sampleStringStatement(depth: number, type: Parameter<StringType>): StringStatement {
    let value: string
    if (this.constantPoolEnabled && prng.nextBoolean(this.constantPoolProbability)) {
      value = this.constantPool.getRandomString()
    } else {
      const valueLength = prng.nextInt(0, this.stringMaxLength - 1);
      value = "";

      for (let index = 0; index < valueLength; index++) {
        value += prng.pickOne([...this.stringAlphabet]);
      }
    }

    return new StringStatement(type, prng.uniqueId(), value)
  }

}
