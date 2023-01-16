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

import { SearchSubject, EncodingSampler } from "@syntest/core";
import { Parameter } from "../../analysis/static/parsing/Parameter";

import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";
import { Statement } from "../statements/Statement";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class SoliditySampler extends EncodingSampler<SolidityTestCase> {
  protected readonly POOL_PROB = 0.5;

  protected constructor(subject: SearchSubject<SolidityTestCase>) {
    super(subject);
  }

  /**
   * Should sample any statement based on the type.
   *
   * @param depth      the current depth of the statement tree
   * @param types      the return types of the statement to sample
   * @param geneType   the type of the statement
   * @return Statement a sampled statement
   */
  abstract sampleStatement(
    depth: number,
    types: Parameter[],
    geneType: string
  ): Statement;

  abstract sampleConstructor(depth: number): ConstructorCall;
  abstract sampleObjectFunctionCall(
    depth: number,
    root: ConstructorCall
  ): ObjectFunctionCall;

  abstract sampleObjectFunctionCallTypeBased(
    depth: number,
    types: Parameter[]
  ): ObjectFunctionCall;

  abstract sampleArgument(
    depth: number,
    type: Parameter,
    bits: number
  ): Statement;
}
