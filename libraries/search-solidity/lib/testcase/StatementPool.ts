/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest JavaScript.
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
import { ActionStatement } from "./statements/action/ActionStatement";
import { Statement } from "./statements/Statement";
import { prng } from "@syntest/prng";
import { Parameter } from "@syntest/analysis-solidity";
import { typeToString } from "@syntest/analysis-solidity";
import { Type } from "@syntest/analysis-solidity";
import { ContractFunctionCall } from "./statements/action/ContractFunctionCall";


export class StatementPool {
  // type -> statement array
  private pool: Map<string, Statement[]>;


  constructor(roots: ActionStatement[]) {
    this.pool = new Map();
    this._fillGenePool(roots);
  }

  public getRandomStatement(type: Type): Statement {
    const statements = this.pool.get(typeToString(type));

    if (!statements || statements.length === 0) {
      return undefined;
    }

    return prng.pickOne(statements);
  }

  private _fillGenePool(roots: ActionStatement[]) {
    for (const action of roots) {
      const queue: Statement[] = [action];

      while (queue.length > 0) {
        const statement = queue.pop();

        if (statement.hasChildren()) {
          queue.push(...statement.getChildren());
        }

        let types: Parameter[] = [statement.type];

        if (statement instanceof ContractFunctionCall) {
          types = statement.type.type.returns
        }

        for (const type of types) {
          const typeAsString = typeToString(type.type)
          if (!this.pool.has(typeAsString)) {
            this.pool.set(typeAsString, []);
          }
          this.pool.get(typeAsString).push(statement);
        }
      }
    }
  }
}
