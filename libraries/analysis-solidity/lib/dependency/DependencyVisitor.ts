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

import { ImportDirective } from "@solidity-parser/parser/dist/src/ast-types";
import { AbstractSyntaxTreeVisitor } from "../ast/AbstractSyntaxTreeVisitor";
import { NodePath } from "../ast/NodePath";

/**
 * Visits the AST nodes of a contract to find all import statements
 */
export class DependencyVisitor extends AbstractSyntaxTreeVisitor {
  protected _imports: Set<string>;

  get imports() {
    return this._imports
  }

  constructor(
    filePath: string,
    syntaxForgiving: boolean
  ) {
    super(filePath, syntaxForgiving);
    this._imports = new Set<string>();
  }

  /**
   * @inheritDoc
   */
  override ImportDirective = (path: NodePath<ImportDirective>): void => {
    this._imports.add(path.node.path);
  }

  /**
   * Return the found imports.
   */
  getImports(): string[] {
    return [...this._imports];
  }
}
