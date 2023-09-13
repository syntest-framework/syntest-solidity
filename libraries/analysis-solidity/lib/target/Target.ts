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
import {
    SubTarget as CoreSubTarget,
    Target as CoreTarget,
    TargetType,
  } from "@syntest/analysis";


export interface Target extends CoreTarget {
    path: string;
    name: string;
    subTargets: SubTarget[];
  }
  
  export interface SubTarget extends CoreSubTarget {
    type: TargetType;
    id: string;
    name: string;
  }
  
  export interface ContractTarget extends SubTarget {
    type: TargetType.CLASS
    kind: ContractKind
    bases: string[]
  }
  
  export interface FunctionTarget extends SubTarget {
    type: TargetType.FUNCTION

      /**
   * Visibility of the action.
   */
  visibility: Visibility;
  /**
   * If the function is a constructor.
   */
  isConstructor: boolean;

  /**
   * Parameters of the function.
   */
  parameters: Parameter[];

  /**
   * Return parameters of the function
   */
  returnParameters: Parameter[];

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
 * Interface for a Parameter Description.
 *
 * @author Dimitri Stallenberg
 */
export interface Parameter {
    /**
     * Name of the parameter.
     */
    name: string;
  
    /**
     * Type of the parameter.
     */
    type: string;
  }
  


  export enum ContractKind {
    Contract = "contract",
    Library = "library",
    Interface = "interface",
  }
  
  export enum Visibility {
    Public = "public",
    Private = "private",
    Internal = 'internal',
    External = "external"
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