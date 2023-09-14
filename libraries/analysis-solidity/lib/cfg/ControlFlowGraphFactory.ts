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

import { ControlFlowGraphFactory as CoreControlFlowGraphFactory } from "@syntest/analysis";
import { SourceUnit } from "@solidity-parser/parser/dist/src/ast-types";
import { Factory } from "../Factory";
import { ControlFlowGraphVisitor } from "./ControlFlowGraphVisitor";
import { ControlFlowProgram, contractControlFlowProgram } from "@syntest/cfg";
import { visit } from "../ast/visit";
import { NodePath } from "../ast/NodePath";

export class ControlFlowGraphFactory
  extends Factory
  implements CoreControlFlowGraphFactory<NodePath<SourceUnit>>
{
  convert(filePath: string, ast: NodePath<SourceUnit>): ControlFlowProgram {
    const visitor = new ControlFlowGraphVisitor(filePath, this.syntaxForgiving);
    visit(ast, visitor);

    return contractControlFlowProgram(visitor.cfg);
  }
}
