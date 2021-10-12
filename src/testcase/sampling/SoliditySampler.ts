/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
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

import {
  TestCaseSampler,
  Statement,
  SearchSubject,
  Parameter,
} from "@syntest/framework";

import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { ObjectFunctionCall } from "../statements/action/ObjectFunctionCall";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class SoliditySampler extends TestCaseSampler {
  protected readonly POOL_PROB = 0.5;

  protected constructor(subject: SearchSubject<SolidityTestCase>) {
    super(subject);
  }

  abstract sampleConstructor(depth: number): ConstructorCall;
  abstract sampleObjectFunctionCall(
    depth: number,
    types: Parameter[]
  ): ObjectFunctionCall;
  abstract sampleArgument(
    depth: number,
    type: Parameter,
    bits: number
  ): Statement;
}
