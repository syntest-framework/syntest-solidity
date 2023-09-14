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
import { AbstractSyntaxTreeFactory as CoreAbstractSyntaxTreeFactory } from "@syntest/analysis";
import { NodePath } from "./NodePath";
import { Hub } from "./Hub";

/**
 * Abstract Syntax Trees (AST) generator for targets.
 */
export class AbstractSyntaxTreeFactory
  implements CoreAbstractSyntaxTreeFactory<NodePath<SourceUnit>>
{
  /**
   * Generate Abstract Syntax Tree (AST) for specified target.
   *
   * @param filepath The filePath of the target
   * @param source The source of the target
   */
  convert(filepath: string, source: string): NodePath<SourceUnit> {
    const sourceUnit = <SourceUnit>SolidityParser.parse(source, {
      loc: true,
      range: true,
    });

    return new NodePath(new Hub(filepath, source), sourceUnit, undefined);
  }
}
