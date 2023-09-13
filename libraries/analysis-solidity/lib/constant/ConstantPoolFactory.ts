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
import { Factory } from "../Factory";
import { ConstantPool } from "./ConstantPool";
import { ConstantVisitor } from "./ConstantVisitor";
import { visit } from "@solidity-parser/parser"

export class ConstantPoolFactory extends Factory {
    /**
     * Generate function map for specified target.
     *
     * @param AST The AST of the target
     */
    extract(
      filePath: string,
      AST: t.Node,
      constantPool?: ConstantPool | undefined
    ): ConstantPool {
      if (!constantPool) {
        constantPool = new ConstantPool();
      }
      const constantVisitor = new ConstantVisitor(
        filePath,
        this.syntaxForgiving,
        constantPool
      );
      visit(AST, constantVisitor);
  
      return constantPool;
    }
  }
  