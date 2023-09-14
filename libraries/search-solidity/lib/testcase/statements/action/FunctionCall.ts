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

import { prng } from "@syntest/prng";
import { SoliditySampler } from "../../sampling/SoliditySampler";
import { ActionStatement } from "./ActionStatement";
import { Statement } from "../Statement";
import { Parameter } from "@syntest/analysis-solidity";

/**
 * @author Dimitri Stallenberg
 */
export class FunctionCall extends ActionStatement {
  get functionName(): string {
    return this._functionName;
  }

  private readonly _functionName: string;

  /**
   * Constructor
   * @param types the return types of the function
   * @param uniqueId id of the gene
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    functionName: string,
    arguments_: Statement[]
  ) {
    super(types, uniqueId, [...arguments_]);
    this._functionName = functionName;
  }

  mutate(sampler: SoliditySampler, depth: number) {
    if (prng.nextBoolean(sampler.deltaMutationProbability)) {
      if (this.arguments_.length === 0) {
        return this.copy();
      }
      
      // randomly mutate one of the args
      const arguments_ = this.arguments_.map((a: Statement) => a.copy());
      const index = prng.nextInt(0, arguments_.length - 1);
      arguments_[index] = arguments_[index].mutate(sampler, depth + 1);

      return new FunctionCall(this.types, this.uniqueId, this.functionName, arguments_);
    } else {
      // resample the gene
      return sampler.sampleStatement(depth, this.types, "functionCall");
    }
  }

  copy(): FunctionCall {
    const deepCopyArguments = this.arguments_.map((a: Statement) => a.copy());

    return new FunctionCall(
      this.types,
      this.uniqueId,
      this.functionName,
      deepCopyArguments
    );
  }

  hasChildren(): boolean {
    return this.arguments_.length > 0;
  }

  getChildren(): Statement[] {
    return [...this.arguments_];
  }
}
