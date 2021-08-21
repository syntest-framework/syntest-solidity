/**
 * Interface for a Solidity function.
 *
 * @author Mitchell Olsthoorn
 */
import { FunctionDescription, Visibility } from "syntest-framework";

export interface ContractFunction extends FunctionDescription {
  /**
   * If the function is the fallback function.
   */
  isFallback: boolean;

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
}

export const InternalVisibility: Visibility = {
  name: "internal",
};

export const ExternalVisibility: Visibility = {
  name: "external",
};

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
