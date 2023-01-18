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

import { TargetMetaData } from "@syntest/core";

/**
 * Interface for Solidity contract metadata.
 *
 * @author Mitchell Olsthoorn
 */
export interface ContractMetadata extends TargetMetaData {
  /**
   * Name of the contract.
   */
  name: string;

  /**
   * Kind of contract: "contract", "library", "interface".
   */
  kind: ContractKind;

  /**
   * The contracts this contracts extends from.
   */
  bases: string[];
}

export enum ContractKind {
  Contract = "contract",
  Library = "library",
  Interface = "interface",
}
