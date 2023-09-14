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

import {
  ContractDefinition,
  FunctionDefinition,
  TypeName,
  VariableDeclaration,
} from "@solidity-parser/parser/dist/src/ast-types";

import { TargetType } from "@syntest/analysis";
import {
  ContractKind,
  ContractTarget,
  FunctionTarget,
  SubTarget,
} from "./Target";
import { AbstractSyntaxTreeVisitor } from "../ast/AbstractSyntaxTreeVisitor";
import { NodePath } from "../ast/NodePath";
import { Type, TypeEnum } from "../types/Type";
import { Parameter } from "../types/Parameter";
import { Visibility, getVisibility } from "../types/Visibility";
import { getStateMutability } from "../types/StateMutability";

/**
 * Visits the AST nodes of a contract to find all functions with public or external visibility.
 */
export class TargetVisitor extends AbstractSyntaxTreeVisitor {
  protected _current: ContractTarget;

  private _subTargets: SubTarget[];

  get subTargets() {
    return this._subTargets;
  }

  constructor(filePath: string, syntaxForgiving: boolean) {
    super(filePath, syntaxForgiving);
    this._subTargets = [];
  }

  override ContractDefinition = (path: NodePath<ContractDefinition>): void => {
    const name = path.node.name;
    const id = this._getNodeId(path);

    let kind: ContractKind;
    switch (path.node.kind) {
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

    const baseContracts = path.node.baseContracts.map((base) => {
      return base.baseName.namePath;
    });

    const target: ContractTarget = {
      id: id,
      name: name,
      type: TargetType.CLASS,
      kind: kind,
      bases: baseContracts,
    };

    this._subTargets.push(target);

    this._current = target;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override "ContractDefinition:exit" = (
    path: NodePath<ContractDefinition>
  ): void => {
    this._current = undefined;
  };

  override FunctionDefinition = (path: NodePath<FunctionDefinition>): void => {
    // Skip function if we are not in a contract
    if (!this._current) return;

    let name = path.node.name;
    const id = this._getNodeId(path);

    if (name === null && path.node.isConstructor) {
      name = this._current.name;
    }

    const parameters = path.get("parameters").map((parameter) => {
      const functionParameter: Parameter = {
        name: parameter.node.name,
        type: this.resolveTypes(parameter.node.typeName),
      };
      return functionParameter;
    });

    let visibility;
    switch (path.node.visibility) {
      case "default": {
        visibility = Visibility.Public;
        break;
      }
      case "public": {
        visibility = Visibility.Public;
        break;
      }
      case "external": {
        visibility = Visibility.External;
        break;
      }
      case "internal": {
        visibility = Visibility.Internal;
        break;
      }
      case "private": {
        visibility = Visibility.Private;
        break;
      }
    }

    const mutability = getStateMutability(path.node.stateMutability);

    const overrides = path.node.override
      ? path.get("override").map((override) => {
          return override.node.namePath;
        })
      : [];

    const modifiers = path.get("modifiers").map((modifier) => {
      return modifier.node.name;
    });

    const returnParameters = path.has("returnParameters")
      ? path.get("returnParameters").map((parameter) => {
          const functionParameter: Parameter = {
            name: parameter.node.name,
            type: this.resolveTypes(parameter.node.typeName),
          };
          return functionParameter;
        })
      : [];

    const contractFunction: FunctionTarget = {
      type: TargetType.FUNCTION,
      id: id,
      name: name,
      isConstructor: path.node.isConstructor,
      isFallback: !path.node.name,
      parameters: parameters,
      visibility: visibility,
      mutability: mutability,
      isVirtual: false,
      override: overrides,
      modifiers: modifiers,
      returnParameters: returnParameters,
    };

    this._subTargets.push(contractFunction);
  };

  private resolveParameters(parameters: VariableDeclaration[]): Parameter[] {
    return parameters.map((parameter) => {
      const functionParameter: Parameter = {
        name: parameter.name,
        type: this.resolveTypes(parameter.typeName),
      };
      return functionParameter;
    });
  }

  /**
   * Resolve a Solidity type name to a string.
   *
   * @param type The type to resolve
   * @protected
   */
  public resolveTypes(type: TypeName): Type {
    switch (type.type) {
      case "ElementaryTypeName": {
        if (type.name === "address") {
          return {
            type: TypeEnum.ADDRESS,
            stateMutability: type.stateMutability
              ? getStateMutability(type.stateMutability)
              : undefined,
          };
        } else if (type.name.startsWith("int")) {
          return {
            type: TypeEnum.INT,
            bits: Number.parseInt(type.name.split("int")[0]),
            signed: true,
            stateMutability: type.stateMutability
              ? getStateMutability(type.stateMutability)
              : undefined,
          };
        } else if (type.name.startsWith("uint")) {
          return {
            type: TypeEnum.INT,
            bits: Number.parseInt(type.name.split("uint")[0]),
            signed: false,
            stateMutability: type.stateMutability
              ? getStateMutability(type.stateMutability)
              : undefined,
          };
        } else if (type.name.startsWith("fixed")) {
          return {
            type: TypeEnum.INT,
            bits: Number.parseInt(type.name.split("fixed")[0]),
            signed: true,
            stateMutability: type.stateMutability
              ? getStateMutability(type.stateMutability)
              : undefined,
          };
        } else if (type.name.startsWith("ufixed")) {
          return {
            type: TypeEnum.INT,
            bits: Number.parseInt(type.name.split("ufixed")[0]),
            signed: false,
            stateMutability: type.stateMutability
              ? getStateMutability(type.stateMutability)
              : undefined,
          };
        }

        throw new Error(`Unsupported type detected: ${type.type}`);
      }
      case "UserDefinedTypeName": {
        return {
          type: TypeEnum.USER_DEFINED,
          name: type.namePath,
        };
      }
      case "Mapping": {
        return {
          type: TypeEnum.MAPPING,
          keyType: this.resolveTypes(type.keyType),
          valueType: this.resolveTypes(type.valueType),
        };
      }
      case "ArrayTypeName": {
        return {
          type: TypeEnum.ARRAY,
          baseType: this.resolveTypes(type.baseTypeName),
          // TODO lenght or something type.length
        };
      }
      case "FunctionTypeName": {
        return {
          type: TypeEnum.FUNCTION,
          parameters: this.resolveParameters(type.parameterTypes),
          returns: this.resolveParameters(type.returnTypes),
          visibility: getVisibility(type.visibility),
          stateMutability: type.stateMutability
            ? getStateMutability(type.stateMutability)
            : undefined,
        };
      }
    }
  }
}
