/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Core.
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
import { SamplerOptions, SamplerPlugin } from "@syntest/base-language";
import {
  SolidityRandomSampler,
  SoliditySubject,
  SolidityTestCase,
} from "@syntest/search-solidity";
import { EncodingSampler } from "@syntest/search";
import { SolidityArguments } from "../../SolidityLauncher";

/**
 * Plugin for RandomSampler
 *
 * @author Dimitri Stallenberg
 */
export class RandomSamplerPlugin extends SamplerPlugin<SolidityTestCase> {
  constructor() {
    super("solidity-random", "A Solidity random sampler plugin");
  }

  createSamplerOperator(
    options: SamplerOptions<SolidityTestCase>
  ): EncodingSampler<SolidityTestCase> {
    return new SolidityRandomSampler(
      options.subject as unknown as SoliditySubject,
      undefined, // TODO incorrect constant pool should be part of sampler options
      (<SolidityArguments>(<unknown>this.args)).constantPool,
      (<SolidityArguments>(<unknown>this.args)).constantPoolProbability,
      (<SolidityArguments>(<unknown>this.args)).statementPool,
      (<SolidityArguments>(<unknown>this.args)).statementPoolProbability,
      (<SolidityArguments>(<unknown>this.args)).maxActionStatements,
      (<SolidityArguments>(<unknown>this.args)).stringAlphabet,
      (<SolidityArguments>(<unknown>this.args)).stringMaxLength,
      (<SolidityArguments>(<unknown>this.args)).deltaMutationProbability,
      (<SolidityArguments>(<unknown>this.args)).exploreIllegalValues,
      (<SolidityArguments>(<unknown>this.args)).numericDecimals
    );
  }

  override getOptions() {
    return new Map();
  }
}
