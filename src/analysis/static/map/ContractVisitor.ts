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

import { SolidityVisitor } from "../SolidityVisitor";
import {
  ContractDefinition,
  FunctionDefinition,
  TypeName,
} from "@solidity-parser/parser";
import { ContractMetadata, ContractKind } from "./ContractMetadata";
import {
  ContractFunction,
  ContractFunctionMutability,
  ExternalVisibility,
  InternalVisibility,
} from "./ContractFunction";
import { Parameter } from "../parsing/Parameter";
import { PublicVisibility, PrivateVisibility } from "../parsing/Visibility";

/**
 * Visits the AST nodes of a contract to find all functions with public or external visibility.
 *
 * @author Mitchell Olsthoorn
 */
export class ContractVisitor implements SolidityVisitor {
  protected _current: ContractMetadata;
  protected _contracts: Map<string, ContractMetadata>;
  protected _functions: Map<string, Map<string, ContractFunction>>;

  constructor() {
    this._contracts = new Map<string, ContractMetadata>();
    this._functions = new Map<string, Map<string, ContractFunction>>();
  }

  ContractDefinition(node: ContractDefinition): void {
    const name = node.name;

    let kind: ContractKind;
    switch (node.kind) {
      case "contract": {
        kind = ContractKind.Contract;
        break;
      }
      case "library": {
        kind = ContractKind.Library;
        break;
      }
      case "interface": {
        kind = ContractKind.Interface;
        break;
      }
    }

    const baseContracts = node.baseContracts.map((base) => {
      return base.baseName.namePath;
    });

    const contract: ContractMetadata = {
      name: name,
      kind: kind,
      bases: baseContracts,
    };

    this._contracts.set(name, contract);
    this._current = contract;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  "ContractDefinition:exit"(node: ContractDefinition): void {
    this._current = null;
  }

  FunctionDefinition(node: FunctionDefinition): void {
    // Skip function if we are not in a contract
    if (!this._current) return;

    let name = node.name;

    if (name === null && node.isConstructor) {
      name = this._current.name;
    }

    const parameters = node.parameters.map((param) => {
      const functionParameter: Parameter = {
        name: param.name,
        type: ContractVisitor.resolveTypes(param.typeName),
      };
      return functionParameter;
    });

    let visibility;
    switch (node.visibility) {
      case "default":
        visibility = PublicVisibility;
        break;
      case "public":
        visibility = PublicVisibility;
        break;
      case "external":
        visibility = ExternalVisibility;
        break;
      case "internal":
        visibility = InternalVisibility;
        break;
      case "private":
        visibility = PrivateVisibility;
        break;
    }

    let mutability;
    switch (node.stateMutability) {
      case "view":
        mutability = ContractFunctionMutability.View;
        break;
      case "pure":
        mutability = ContractFunctionMutability.Pure;
        break;
      case "payable":
        mutability = ContractFunctionMutability.Payable;
        break;
    }

    const overrides = node.override
      ? node.override.map((override) => {
          return override.namePath;
        })
      : [];

    const modifiers = node.modifiers.map((modifier) => {
      return modifier.name;
    });

    const returnParameters = node.returnParameters
      ? node.returnParameters.map((param) => {
          const functionParameter: Parameter = {
            name: param.name,
            type: ContractVisitor.resolveTypes(param.typeName),
          };
          return functionParameter;
        })
      : [
          <Parameter>{
            name: "",
            type: "void",
          },
        ];

    const contractFunction: ContractFunction = {
      name: name,
      type: node.isConstructor ? "constructor" : "function",
      isConstructor: node.isConstructor,
      isFallback: !node.name,
      parameters: parameters,
      visibility: visibility,
      mutability: mutability,
      isVirtual: false,
      override: overrides,
      modifiers: modifiers,
      returnParameters: returnParameters,
    };

    const functionSignature = `${name}(${parameters
      .map((param) => {
        return param.type;
      })
      .join(",")}):${returnParameters
      .map((param) => {
        return param.type;
      })
      .join(",")}`;

    if (!this._functions.has(this._current.name))
      this._functions.set(
        this._current.name,
        new Map<string, ContractFunction>()
      );

    this._functions
      .get(this._current.name)
      .set(functionSignature, contractFunction);
  }

  /**
   * Resolve a Solidity type name to a string.
   *
   * @param type The type to resolve
   * @protected
   */
  public static resolveTypes(type: TypeName): string {
    let paramType: string;
    switch (type.type) {
      case "ElementaryTypeName": {
        paramType = type.name;
        break;
      }
      case "UserDefinedTypeName": {
        paramType = type.namePath;
        break;
      }
      case "Mapping": {
        paramType = `Map<${type.keyType.name},${this.resolveTypes(
          type.valueType
        )}>`;
        break;
      }
      case "ArrayTypeName": {
        paramType = `${this.resolveTypes(type.baseTypeName)}[]`;
        break;
      }
      case "FunctionTypeName": {
        const parameterTypes = type.parameterTypes
          .map((param) => {
            return this.resolveTypes(param);
          })
          .join(",");

        const returnTypes = type.returnTypes
          .map((param) => {
            return this.resolveTypes(param);
          })
          .join(",");

        paramType = `function(${parameterTypes}):${returnTypes}`;
        break;
      }
    }
    return paramType;
  }

  getContractMap(): Map<string, ContractMetadata> {
    return this._contracts;
  }

  getFunctionMap(): Map<string, Map<string, ContractFunction>> {
    return this._functions;
  }
}
