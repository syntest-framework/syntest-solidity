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

/**
 * Function can only be called from within the contract where it is defined and all contracts that inherit from it.
 */
export const InternalVisibility: Visibility = {
  name: "internal",
};

/**
 * Function can only be called from outside the contract.
 */
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
