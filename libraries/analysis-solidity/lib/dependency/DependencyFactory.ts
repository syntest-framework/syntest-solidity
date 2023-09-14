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
import { DependencyFactory as CoreDependencyFactory } from "@syntest/analysis";

import { DependencyVisitor } from "./DependencyVisitor";
import { Factory } from "../Factory";
import { SourceUnit } from "@solidity-parser/parser/dist/src/ast-types";
import { NodePath } from "../ast/NodePath";
import { visit } from "../ast/visit";

/**
 * Dependency generator for targets.
 */
export class DependencyFactory
  extends Factory
  implements CoreDependencyFactory<NodePath<SourceUnit>>
{
  /**
   * Generate function map for specified target.
   *
   * @param ast The AST of the target
   */
  extract(filePath: string, ast: NodePath<SourceUnit>): string[] {
    const visitor = new DependencyVisitor(filePath, this.syntaxForgiving);

    visit(ast, visitor);

    return [...visitor.imports];
  }
}
