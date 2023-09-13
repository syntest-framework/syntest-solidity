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
import { RootContext as CoreRootContext, SourceFactory } from "@syntest/analysis";

import { Logger, getLogger } from "@syntest/logging";
import { ConstantPool } from "./constant/ConstantPool";
import { AbstractSyntaxTreeFactory } from "./ast/AbstractSyntaxTreeFactory";
import { ConstantPoolFactory } from "./constant/ConstantPoolFactory";
import { ControlFlowGraphFactory } from "./cfg/ControlFlowGraphFactory";

export class RootContext extends CoreRootContext<any> {
    protected static LOGGER: Logger;

    protected _constantPoolFactory: ConstantPoolFactory;

    protected _targetFiles: Set<string>;
    protected _analysisFiles: Set<string>;

    constructor(
        rootPath: string,
        sourceFactory: SourceFactory,
        targetFiles: Set<string>,
        analysisFiles: Set<string>,
        abstractSyntaxTreeFactory: AbstractSyntaxTreeFactory,
        controlFlowGraphFactory: ControlFlowGraphFactory,
        targetFactory: TargetFactory,
        dependencyFactory: DependencyFactory,
        constantPoolFactory: ConstantPoolFactory
      ) {
        super(
          rootPath,
          sourceFactory,
          abstractSyntaxTreeFactory,
          controlFlowGraphFactory,
          targetFactory,
          dependencyFactory
        );
        RootContext.LOGGER = getLogger("RootContext");
        this._targetFiles = targetFiles;
        this._analysisFiles = analysisFiles;
        this._constantPoolFactory = constantPoolFactory;
      }

  // TODO cache
  getConstantPool(filepath: string): ConstantPool {
    const absolutePath = this.resolvePath(filepath);

    RootContext.LOGGER.info("Extracting constants");
    const ast = this.getAbstractSyntaxTree(absolutePath);

    const constantPool = this._constantPoolFactory.extract(
      absolutePath,
      ast
    );

    RootContext.LOGGER.info("Extracting constants done");
    return constantPool;
  }
}