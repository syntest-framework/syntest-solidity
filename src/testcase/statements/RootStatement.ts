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

import { Statement } from "./Statement";
import { EncodingSampler } from "@syntest/framework/dist/search/EncodingSampler";
import { Encoding } from "@syntest/framework/dist/search/Encoding";
import { ActionStatement } from "./action/ActionStatement";
import { Parameter } from "../../analysis/static/parsing/Parameter";

/**
 * @author Dimitri Stallenberg
 */
export abstract class RootStatement extends ActionStatement {
  private _children: Statement[];

  protected constructor(
    types: Parameter[],
    uniqueId: string,
    args: Statement[],
    children: Statement[]
  ) {
    super(types, uniqueId, args);
    this._children = children;
  }

  abstract mutate(
    sampler: EncodingSampler<Encoding>,
    depth: number
  ): RootStatement;

  abstract copy(): RootStatement;

  hasChildren(): boolean {
    return !!this._children.length || !!this.args.length;
  }

  getChildren(): Statement[] {
    return [...this._children, ...this.args];
  }

  get children(): Statement[] {
    return this._children;
  }
}
