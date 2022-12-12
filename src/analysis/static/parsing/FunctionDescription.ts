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

import { ActionDescription } from "./ActionDescription";
import { Parameter } from "./Parameter";

/**
 * Interface for a Function Description.
 *
 * @author Dimitri Stallenberg
 */
export interface FunctionDescription extends ActionDescription {
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
}
