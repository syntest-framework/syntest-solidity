/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
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
  BranchDistance as CoreBranchDistance,
  shouldNeverHappen,
} from "@syntest/search";
import { Logger, getLogger } from "@syntest/logging";

export class BranchDistance extends CoreBranchDistance {
  protected static LOGGER: Logger;
  protected syntaxForgiving: boolean;
  protected stringAlphabet: string;

  constructor(syntaxForgiving: boolean, stringAlphabet: string) {
    super();
    this.syntaxForgiving = syntaxForgiving;
    BranchDistance.LOGGER = getLogger("BranchDistance");
    this.stringAlphabet = stringAlphabet;
  }

  calculate(
    condition: string,
    variables: Record<string, unknown>,
    trueOrFalse: boolean
  ): number {
    if (condition === undefined || variables === undefined) {
      return 1;
    }
    // TODO
    //   const options: unknown = JSON.parse(JSON.stringify(defaultBabelOptions));

    //   const ast = transformSync(condition, options).ast;
    //   const visitor = new BranchDistanceVisitor(
    //     this.syntaxForgiving,
    //     this.stringAlphabet,
    //     variables,
    //     !trueOrFalse
    //   );

    //   traverse(ast, visitor);
    //   let distance = visitor._getDistance(condition);
    let distance = 0;

    if (distance > 1 || distance < 0) {
      const variables_ = Object.entries(variables)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      throw new Error(
        `Invalid distance: ${distance} for ${condition} -> ${trueOrFalse}. Variables: ${variables_}`
      );
    }

    if (Number.isNaN(distance)) {
      throw new TypeError(shouldNeverHappen("BranchDistance"));
    }

    if (distance === 1) {
      // We dont want a branch distance of 1 because then it will be equal to covering the oposite branch
      distance = 0.999_999_999_999_999_9;
    }

    if (distance === 0) {
      // in general it should not be zero if used correctly so we give a warning
      const variables_ = Object.entries(variables)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      BranchDistance.LOGGER.warn(
        `Calculated distance for condition '${condition}' -> ${trueOrFalse}, is zero. Variables: ${variables_}`
      );
    }
    return distance;
  }
}
