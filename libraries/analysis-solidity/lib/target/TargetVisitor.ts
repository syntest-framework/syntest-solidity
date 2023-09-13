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
} from "@solidity-parser/parser/dist/src/ast-types";

import { AbstractSyntaxTreeVisitor } from "@syntest/ast-visitor-solidity";
import { TargetType } from "@syntest/analysis";
import { ContractFunctionMutability, ContractKind, ContractTarget, FunctionTarget, Parameter, SubTarget, Visibility } from "./Target";

/**
 * Visits the AST nodes of a contract to find all functions with public or external visibility.
 */
export class TargetVisitor extends AbstractSyntaxTreeVisitor {
  protected _current: ContractTarget;

  private _subTargets: SubTarget[];

  constructor(
    filePath: string,
    syntaxForgiving: boolean
  ) {
    super(filePath, syntaxForgiving);
    this._subTargets = [];
  }

  ContractDefinition = (node: ContractDefinition): void => {
    const name = node.name;
    const id = this._getNodeId(node)
    
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

    const target: ContractTarget = {
      id: id,
      name: name,
      type: TargetType.CLASS,
      kind: kind,
      bases: baseContracts
    }

    this._subTargets.push(target)

    this._current = target;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  "ContractDefinition:exit" = (node: ContractDefinition): void => {
    this._current = undefined;
  }

  FunctionDefinition = (node: FunctionDefinition): void => {
    // Skip function if we are not in a contract
    if (!this._current) return;

    let name = node.name;
    const id = this._getNodeId(node)

    if (name === null && node.isConstructor) {
      name = this._current.name;
    }

    const parameters = node.parameters.map((parameter) => {
      const functionParameter: Parameter = {
        name: parameter.name,
        type: this.resolveTypes(parameter.typeName),
      };
      return functionParameter;
    });

    let visibility;
    switch (node.visibility) {
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

    let mutability;
    switch (node.stateMutability) {
      case "view": {
        mutability = ContractFunctionMutability.View;
        break;
      }
      case "pure": {
        mutability = ContractFunctionMutability.Pure;
        break;
      }
      case "payable": {
        mutability = ContractFunctionMutability.Payable;
        break;
      }
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
      ? node.returnParameters.map((parameter) => {
          const functionParameter: Parameter = {
            name: parameter.name,
            type: this.resolveTypes(parameter.typeName),
          };
          return functionParameter;
        })
      : [
          <Parameter>{
            name: "",
            type: "void",
          },
        ];

    const contractFunction: FunctionTarget = {
      type: TargetType.FUNCTION,
      id: id,
      name: name,
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

    this._subTargets.push(contractFunction)
  }

  /**
   * Resolve a Solidity type name to a string.
   *
   * @param type The type to resolve
   * @protected
   */
  public resolveTypes(type: TypeName): string {
    let parameterType: string;
    switch (type.type) {
      case "ElementaryTypeName": {
        parameterType = type.name;
        break;
      }
      case "UserDefinedTypeName": {
        parameterType = type.namePath;
        break;
      }
      case "Mapping": {
        parameterType = type.keyType.type === "ElementaryTypeName" ? `Map<${type.keyType.name},${this.resolveTypes(
            type.valueType
          )}>` : `Map<${type.keyType.namePath},${this.resolveTypes(
            type.valueType
          )}>`;
        break;
      }
      case "ArrayTypeName": {
        parameterType = `${this.resolveTypes(type.baseTypeName)}[]`;
        break;
      }
      case "FunctionTypeName": {
        const parameterTypes = type.parameterTypes
          .map((parameter) => {
            return parameter.name;
          })
          .join(",");

        const returnTypes = type.returnTypes
          .map((parameter) => {
            return parameter.name;
          })
          .join(",");

        parameterType = `function(${parameterTypes}):${returnTypes}`;
        break;
      }
    }
    return parameterType;
  }
}
