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

import { Crossover } from "@syntest/search";

import { SolidityTestCase } from "../../testcase/SolidityTestCase";
import { Statement } from "../../testcase/statements/Statement";
import { prng } from "@syntest/prng";
import { ActionStatement } from "../../testcase/statements/action/ActionStatement";
import { typeToString } from "@syntest/analysis-solidity";

type SwapStatement = {
  parent: Statement;
  childIndex: number;
  child: Statement;
};

type MatchingPair = {
  parentA: SwapStatement;
  parentB: SwapStatement;
};

/**
 * Creates 2 children which are each other's complement with respect to their parents.
 * i.e. given parents 000000 and 111111 a possible pair of children would be 001111 and 110000.
 * However, it is not as simple because the actual mutation works with trees.
 *
 * @param parentA the first parent individual
 * @param parentB the second parent individual
 *
 * @return a tuple of 2 children
 */
export class TreeCrossover extends Crossover<SolidityTestCase> {
  public crossOver(parents: SolidityTestCase[]): SolidityTestCase[] {
    if (parents.length !== 2) {
      throw new Error("Expected exactly 2 parents, got: " + parents.length);
    }

    const rootA: ActionStatement[] = (<SolidityTestCase>parents[0].copy())
      .roots;
    const rootB: ActionStatement[] = (<SolidityTestCase>parents[1].copy())
      .roots;

    const swapStatementsA = this.convertToSwapStatements(rootA);
    const swapStatementsB = this.convertToSwapStatements(rootB);

    const crossoverOptions: MatchingPair[] = [];

    for (const swapA of swapStatementsA) {
      for (const swapB of swapStatementsB) {
        if (!swapA.child.type || !swapB.child.type) {
          throw new Error("All statements require a type!");
        }

        if (
          typeToString(swapA.child.type.type) ===
          typeToString(swapB.child.type.type)
        ) {
          crossoverOptions.push({
            parentA: swapA,
            parentB: swapB,
          });
        }
      }
    }

    if (crossoverOptions.length > 0) {
      // TODO this ignores _crossoverStatementProbability and always picks one

      const matchingPair = prng.pickOne(crossoverOptions);
      const parentA = matchingPair.parentA;
      const parentB = matchingPair.parentB;

      if (parentA.parent !== undefined && parentB.parent !== undefined) {
        parentA.parent.setChild(parentA.childIndex, parentB.child.copy());
        parentB.parent.setChild(parentB.childIndex, parentA.child.copy());
      } else if (parentB.parent !== undefined) {
        if (!(parentB.child instanceof ActionStatement)) {
          throw new TypeError(
            "expected parentB child to be an actionstatement"
          );
        }
        rootA[parentA.childIndex] = parentB.child.copy();
        parentB.parent.setChild(parentB.childIndex, parentA.child.copy());
      } else if (parentA.parent === undefined) {
        if (!(parentA.child instanceof ActionStatement)) {
          throw new TypeError(
            "expected parentA child to be an actionstatement"
          );
        }
        if (!(parentB.child instanceof ActionStatement)) {
          throw new TypeError(
            "expected parentB child to be an actionstatement"
          );
        }
        rootA[parentA.childIndex] = parentB.child.copy();
        rootB[parentB.childIndex] = parentA.child.copy();
      } else {
        if (!(parentA.child instanceof ActionStatement)) {
          throw new TypeError(
            "expected parentA child to be an actionstatement"
          );
        }
        parentA.parent.setChild(parentA.childIndex, parentB.child.copy());
        rootB[parentB.childIndex] = parentA.child.copy();
      }
    }

    return [new SolidityTestCase(rootA), new SolidityTestCase(rootB)];
  }

  protected convertToSwapStatements(roots: ActionStatement[]): SwapStatement[] {
    const swapStatements: SwapStatement[] = [];

    for (const [index, root] of roots.entries()) {
      swapStatements.push({
        parent: undefined,
        childIndex: index,
        child: root,
      });
    }

    const queue: Statement[] = [...roots];

    while (queue.length > 0) {
      const statement = queue.shift();

      if (statement.hasChildren()) {
        for (let index = 0; index < statement.getChildren().length; index++) {
          const child = statement.getChildren()[index];
          swapStatements.push({
            parent: statement,
            childIndex: index,
            child: child,
          });
          queue.push(child);
        }
      }
    }

    return swapStatements;
  }
}
