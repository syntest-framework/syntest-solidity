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

import { EncodingSampler, Encoding } from "@syntest/search";
import { Parameter, Type } from "@syntest/analysis-solidity";
import { Decoding } from "../../testbuilding/Decoding";
import { ContextBuilder } from "../../testbuilding/ContextBuilder";

/**
 * Statement
 */
export abstract class Statement<T extends Type = Type> {
  public get uniqueId(): string {
    return this._uniqueId;
  }
  public get type(): Parameter<T> {
    return this._type;
  }

  private _type: Parameter<T>;
  private _uniqueId: string;

  /**
   * Constructor
   * @param type
   * @param uniqueId
   */
  protected constructor(type: Parameter<T>, uniqueId: string) {
    this._type = type;
    this._uniqueId = uniqueId;
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
  abstract copy(): Statement<T>;

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

  /**
   * Set a new child at a specified position
   *
   * WARNING: This function has side effects
   *
   * @param index the index position of the new child
   * @param newChild the new child
   */
  abstract setChild(index: number, child: Statement): void;

  /**
   * Decodes the statement
   */
  abstract decode(context: ContextBuilder, exception: boolean): Decoding[];
}
