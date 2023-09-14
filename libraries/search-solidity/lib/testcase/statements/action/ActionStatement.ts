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

import { Statement } from "../Statement";
import { Parameter } from "@syntest/analysis-solidity";

/**
 * @author Dimitri Stallenberg
 */
export abstract class ActionStatement extends Statement {
  private _arguments_: Statement[];

  protected constructor(
    types: Parameter[],
    uniqueId: string,
    arguments_: Statement[]
  ) {
    super(types, uniqueId);
    this._arguments_ = arguments_;
  }

  hasChildren(): boolean {
    return this._arguments_.length > 0;
  }

  getChildren(): Statement[] {
    return [...this._arguments_];
  }

  get arguments_(): Statement[] {
    return this._arguments_;
  }
}
