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

import { ContractVisitor } from "./TargetVisitor";

import { ContractMetadata } from "./ContractMetadata";
import { ContractFunction } from "./ContractFunction";
import { BaseASTNode, SourceUnit } from "@solidity-parser/parser/dist/src/ast-types";
import { visit } from "@solidity-parser/parser";
import { Factory } from "../Factory";
import { TargetFactory as CoreTargetFactory, Target } from "@syntest/analysis";
import path = require("path");

/**
 * Function map generator for targets.
 */
export class TargetFactory extends Factory implements CoreTargetFactory<BaseASTNode> {
  /**
   * Generate function map for specified target.
   *
   * @param AST The AST of the target
   */
  extract(filePath: string, AST: BaseASTNode): Target {
    const visitor = new ContractVisitor(filePath, this.syntaxForgiving);
    visit(AST, visitor);

    return { 
      path: filePath,
      name: path.basename(filePath),
      subTargets: visitor.subTargets
     };
  }
}
