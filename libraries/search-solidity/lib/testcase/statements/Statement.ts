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

import { prng, EncodingSampler, Encoding } from "@syntest/search";
import { Parameter } from "../../analysis/static/parsing/Parameter";

/**
 * @author Dimitri Stallenberg
 */
export abstract class Statement {
  public get varNames(): string[] {
    return this._varNames;
  }
  public get id(): string {
    return this._uniqueId;
  }
  public get types(): Parameter[] {
    return this._types;
  }

  private _varNames: string[];
  private _types: Parameter[];
  private _uniqueId: string;

  /**
   * Constructor
   * @param types
   * @param uniqueId
   */
  protected constructor(types: Parameter[], uniqueId: string) {
    this._types = types;
    this._uniqueId = uniqueId;
    this._varNames = types.map((x) => {
      return x.name + prng.uniqueId();
    });
  }

  /**
   * Mutates the gene
   * @param sampler   the sampler object that is being used
   * @param depth     the depth of the gene in the gene tree
   * @return          the mutated copy of the gene
   */
  abstract mutate(sampler: EncodingSampler<Encoding>, depth: number): Statement;

  /**
   * Creates an exact copy of the current gene
   * @return  the copy of the gene
   */
  abstract copy(): Statement;

  /**
   * Checks whether the gene has children
   * @return  whether the gene has children
   */
  abstract hasChildren(): boolean;

  /**
   * Gets all children of the gene
   * @return  The set of children of this gene
   */
  abstract getChildren(): Statement[];
}
