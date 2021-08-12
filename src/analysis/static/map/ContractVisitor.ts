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
  ContractFunctionParameter,
  ContractFunctionVisibility,
} from "./ContractFunction";

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

    const name = node.name;

    const parameters = node.parameters.map((param) => {
      const functionParameter: ContractFunctionParameter = {
        name: param.name,
        type: this._resolveTypes(param.typeName),
      };
      return functionParameter;
    });

    let visibility;
    switch (node.visibility) {
      case "default":
        visibility = ContractFunctionVisibility.Public;
        break;
      case "public":
        visibility = ContractFunctionVisibility.Public;
        break;
      case "external":
        visibility = ContractFunctionVisibility.External;
        break;
      case "internal":
        visibility = ContractFunctionVisibility.Internal;
        break;
      case "private":
        visibility = ContractFunctionVisibility.Private;
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

    const overrides = node.override.map((override) => {
      return override.namePath;
    });

    const modifiers = node.modifiers.map((modifier) => {
      return modifier.name;
    });

    const returnParameters = node.returnParameters.map((param) => {
      const functionParameter: ContractFunctionParameter = {
        name: param.name,
        type: this._resolveTypes(param.typeName),
      };
      return functionParameter;
    });

    const contractFunction: ContractFunction = {
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

    const functionSignature = `${name}(${parameters.join(
      ","
    )}):${returnParameters.join(",")}`;

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
  protected _resolveTypes(type: TypeName): string {
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
        paramType = `Map<${type.keyType.name},${this._resolveTypes(
          type.valueType
        )}>`;
        break;
      }
      case "ArrayTypeName": {
        paramType = `${this._resolveTypes(type.baseTypeName)}[]`;
        break;
      }
      case "FunctionTypeName": {
        const parameterTypes = type.parameterTypes
          .map((param) => {
            return this._resolveTypes(param);
          })
          .join(",");

        const returnTypes = type.returnTypes
          .map((param) => {
            return this._resolveTypes(param);
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
