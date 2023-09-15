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
import { Visibility } from "../types/Visibility";
import { Parameter } from "../types/Parameter";
import { StateMutability } from "../types/StateMutability";

export interface Target extends CoreTarget {
  path: string;
  name: string;
  subTargets: SubTarget[];
}

export type SubTarget = ContractTarget | FunctionTarget;

export type ContractTarget = CoreSubTarget & {
  type: TargetType.CLASS;
  id: string;
  name: string;
  kind: ContractKind;
  bases: string[];
};

export type FunctionTarget = CoreSubTarget & {
  type: TargetType.FUNCTION;
  id: string;
  contractId: string;
  name: string;

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
  mutability: StateMutability | null;

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
};

export enum ContractKind {
  Contract = "contract",
  Library = "library",
  Interface = "interface",
}


export function isExternal(target: SubTarget) {
  return target.type === TargetType.FUNCTION && target.visibility === Visibility.External
}