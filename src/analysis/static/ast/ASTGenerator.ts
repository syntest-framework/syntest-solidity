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

import SolidityParser = require("@solidity-parser/parser");
import { SourceUnit } from "@solidity-parser/parser/dist/src/ast-types";

/**
 * Abstract Syntax Trees (AST) generator for targets.
 *
 * @author Mitchell Olsthoorn
 */
export class ASTGenerator {
  /**
   * Generate Abstract Syntax Tree (AST) for specified target.
   *
   * @param targetSource The source of the target
   */
  generate(targetSource: string): SourceUnit {
    return <SourceUnit>SolidityParser.parse(targetSource, {
      loc: true,
      range: true,
    });
  }
}
