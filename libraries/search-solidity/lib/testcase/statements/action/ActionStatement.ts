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

import { SoliditySampler } from "../../sampling/SoliditySampler";
import { Statement } from "../Statement";
import { Parameter, Type } from "@syntest/analysis-solidity";

/**
 * ActionStatement
 */
export abstract class ActionStatement<T extends Type = Type> extends Statement<T> {
  private _arguments_: Statement[];

  protected constructor(
    type: Parameter<T>,
    uniqueId: string,
    arguments_: Statement[]
  ) {
    super(type, uniqueId);
    this._arguments_ = arguments_;
  }

  abstract override mutate(sampler: SoliditySampler, depth: number): ActionStatement<T>
  abstract override copy(): ActionStatement<T>

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
