/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
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

import { Parameter } from "./Parameter";
import { StateMutability } from "./StateMutability";
import { Visibility } from "./Visibility";

export enum TypeEnum {
  ADDRESS = "address",
  BOOL = "bool",

  INT = "int",
  FIXED = "fixed",
  FIXED_SIZE_BYTE_ARRAY = "fixed-size-byte-array",
  DYNAMIC_SIZE_BYTE_ARRAY = "dynamic-size-byte-array",

  STRING = "string",

  CONTRACT = "contract", // TODO
  USER_DEFINED = "user-defined",
  FUNCTION = "function", // TODO

  MAPPING = "mapping",
  ARRAY = "array",
}

export type BaseType = {
  /**
   * Type of the parameter.
   */
  type: TypeEnum;
};

export type Address = {
  type: TypeEnum.ADDRESS;
  stateMutability?: StateMutability | undefined;
};

export type Bool = {
  type: TypeEnum.BOOL;
  stateMutability?: StateMutability | undefined;
};

export type Int = {
  type: TypeEnum.INT;
  bits: number;
  signed: true;
  stateMutability?: StateMutability | undefined;
};

export type Uint = {
  type: TypeEnum.INT;
  bits: number;
  signed: false;
  stateMutability?: StateMutability | undefined;
};

export type Fixed = {
  type: TypeEnum.FIXED;
  bits: number;
  signed: true;
  decimals: number;
  stateMutability?: StateMutability | undefined;
};

export type Ufixed = {
  type: TypeEnum.FIXED;
  bits: number;
  signed: false;
  decimals: number;
  stateMutability?: StateMutability | undefined;
};

export type FixedSizeByteArray = {
  type: TypeEnum.FIXED_SIZE_BYTE_ARRAY;
  bytes: number;
};

export type DynamicSizeByteArray = {
  type: TypeEnum.DYNAMIC_SIZE_BYTE_ARRAY;
};

export type StringType = {
  type: TypeEnum.STRING;
};

export type Contract = {
  type: TypeEnum.CONTRACT;
  id: string;
};

export type UserDefined = {
  type: TypeEnum.USER_DEFINED;
  name: string;
};

export type FunctionType = {
  type: TypeEnum.FUNCTION;
  parameters: Parameter[];
  returns: Parameter[];
  visibility: Visibility;
  stateMutability?: StateMutability | undefined;
};

export type Mapping = {
  type: TypeEnum.MAPPING;
  keyType: Type;
  valueType: Type;
};

export type ArrayType = {
  type: TypeEnum.ARRAY;
  baseType: Type;
  // TODO length
};

export type Type =
  | Address
  | Bool
  | Int
  | Uint
  | Fixed
  | Ufixed
  | FixedSizeByteArray
  | DynamicSizeByteArray
  | StringType
  | Contract
  | UserDefined
  | FunctionType
  | Mapping
  | ArrayType;

export function typeToString(type: Type): string {
  switch (type.type) {
    case TypeEnum.ADDRESS:
    case TypeEnum.STRING:
    case TypeEnum.DYNAMIC_SIZE_BYTE_ARRAY:
    case TypeEnum.CONTRACT:

    case TypeEnum.BOOL: {
      return type.type; // TODO statementMutatbility
    }
    case TypeEnum.INT:
    case TypeEnum.FIXED: {
      return `${type.signed ? "" : "u"}${type.type}${type.bits}`;
    }
    case TypeEnum.FIXED_SIZE_BYTE_ARRAY: {
      return `${type.type}${type.bytes}`;
    }
    case TypeEnum.FUNCTION: {
      return `${type.type} (${type.parameters
        .map((t) => typeToString(t.type))
        .join(", ")}) {${type.visibility}} [${
        type.stateMutability
      }] [returns (${type.parameters
        .map((t) => typeToString(t.type))
        .join(", ")})]`;
    }
    case TypeEnum.MAPPING: {
      return `${type.type} (${typeToString(type.keyType)} => ${typeToString(
        type.valueType
      )})`;
    }
    case TypeEnum.USER_DEFINED: {
      return `${type.type} (${type.name})`;
    }

    case TypeEnum.ARRAY: {
      return `${type.baseType}[]`;
    }
  }
}
