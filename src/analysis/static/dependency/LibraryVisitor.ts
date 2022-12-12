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

import { SolidityVisitor } from "../SolidityVisitor";
import {
  ContractDefinition,
  FunctionDefinition,
} from "@solidity-parser/parser";

/**
 * Visits the AST nodes of a contract to find all libraries with public and external functions.
 *
 * @author Mitchell Olsthoorn
 */
export class LibraryVisitor implements SolidityVisitor {
  public libraries: string[];
  protected current;

  constructor() {
    this.libraries = [];
    this.current = null;
  }

  ContractDefinition(node: ContractDefinition): void {
    if (node.kind == "library") {
      this.current = node.name;
    } else {
      this.current = null;
    }
  }

  FunctionDefinition(node: FunctionDefinition): void {
    if (
      this.current &&
      (node.visibility == "public" || node.visibility == "external") &&
      !this.libraries.includes(this.current)
    ) {
      this.libraries.push(this.current);
    }
  }
}
