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

import { SolidityVisitor } from "../SolidityVisitor";
import { ImportDirective } from "@solidity-parser/parser";

/**
 * Visits the AST nodes of a contract to find all import statements
 *
 * @author Mitchell Olsthoorn
 */
export class ImportVisitor implements SolidityVisitor {
  protected _imports: Set<string>;

  constructor() {
    this._imports = new Set<string>();
  }

  /**
   * @inheritDoc
   */
  ImportDirective(node: ImportDirective): void {
    this._imports.add(node.path);
  }

  /**
   * Return the found imports.
   */
  getImports(): string[] {
    return Array.from(this._imports);
  }
}
