/**
 * Interface for a Solidity function.
 *
 * @author Mitchell Olsthoorn
 */
export interface ContractFunction {
  /**
   * Name of the function
   */
  name: string;

  /**
   * If the function is a constructor.
   */
  isConstructor: boolean;

  /**
   * If the function is the fallback function.
   */
  isFallback: boolean;

  /**
   * Parameters of the function.
   */
  parameters: ContractFunctionParameter[];

  /**
   * Visibility of the function.
   */
  visibility: ContractFunctionVisibility;

  /**
   * Mutability of the function.
   */
  mutability: ContractFunctionMutability | null;

  /**
   * If the function is virtual (can be overridden).
   */
  isVirtual: boolean;

  /**
   * If the function overrides another function.
   */
  override: string[] | null;

  /**
   * Modifiers of the function.
   */
  modifiers: string[];

  /**
   * Return parameters of the function
   */
  returnParameters: ContractFunctionParameter[];
}

export interface ContractFunctionParameter {
  /**
   * Name of the parameter.
   */
  name: string;

  /**
   * Type of the parameter.
   */
  type: string;
}

export enum ContractFunctionVisibility {
  /**
   * Function can only be called from within the contract where it is defined.
   */
  Private = "private",

  /**
   * Function can only be called from within the contract where it is defined and all contracts that inherit from it.
   */
  Internal = "internal",

  /**
   * Function can only be called from outside the contract.
   */
  External = "external",

  /**
   * Function can be called from both inside and outside the contract.
   */
  Public = "public",
}

export enum ContractFunctionMutability {
  /**
   * Function reads state but does not modify state.
   */
  View = "view",

  /**
   * Function does not read or modify state.
   */
  Pure = "pure",

  /**
   * Function accepts Ether.
   */
  Payable = "payable",
}
