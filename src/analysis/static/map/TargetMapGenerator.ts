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

import { ContractVisitor } from "./ContractVisitor";

import SolidityParser = require("@solidity-parser/parser");
import { ContractMetadata } from "./ContractMetadata";
import { ContractFunction } from "./ContractFunction";
import { SourceUnit } from "@solidity-parser/parser/dist/src/ast-types";

/**
 * Function map generator for targets.
 *
 * @author Mitchell Olsthoorn
 */
export class TargetMapGenerator {
  /**
   * Generate function map for specified target.
   *
   * @param targetAST The AST of the target
   */
  generate(targetAST: SourceUnit): {
    targetMap: Map<string, ContractMetadata>;
    functionMap: Map<string, Map<string, ContractFunction>>;
  } {
    const visitor = new ContractVisitor();
    SolidityParser.visit(targetAST, visitor);
    const targetMap = visitor.getContractMap();
    const functionMap = visitor.getFunctionMap();
    return { targetMap, functionMap };
  }
}
