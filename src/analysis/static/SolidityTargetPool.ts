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

import { SourceGenerator } from "./source/SourceGenerator";
import { ASTGenerator } from "./ast/ASTGenerator";
import * as path from "path";
import { TargetMapGenerator } from "./map/TargetMapGenerator";
import { SolidityCFGFactory } from "../../graph/SolidityCFGFactory";
import { ContractMetadata } from "./map/ContractMetadata";
import { ContractFunction } from "./map/ContractFunction";
import { TargetPool, Target, CONFIG, EventManager } from "@syntest/search";
import { ImportVisitor } from "./dependency/ImportVisitor";
import * as fs from "fs";
import { LibraryVisitor } from "./dependency/LibraryVisitor";
import SolidityParser = require("@solidity-parser/parser");
import { SourceUnit } from "@solidity-parser/parser/dist/src/ast-types";
import { CFG } from "@syntest/cfg";
import { SolidityTestCase } from "../../testcase/SolidityTestCase";
// eslint-disable-next-line
const { outputFileSync, copySync } = require("fs-extra");

/**
 * Pool for retrieving and caching expensive processing calls.
 *
 * Can be used to retrieve target sources, ASTs, maps, and CFGs.
 *
 * @author Mitchell Olsthoorn
 */
export class SolidityTargetPool extends TargetPool<SolidityTestCase> {
  protected _sourceGenerator: SourceGenerator;
  protected _abstractSyntaxTreeGenerator: ASTGenerator;
  protected _targetMapGenerator: TargetMapGenerator;
  protected _controlFlowGraphGenerator: SolidityCFGFactory;

  // Mapping: filepath -> source code
  protected _sources: Map<string, string>;

  // Mapping: filepath -> AST
  protected _abstractSyntaxTrees: Map<string, SourceUnit>;

  // Mapping: filepath -> target name -> target
  protected _targetMap: Map<string, Map<string, ContractMetadata>>;

  // Mapping: filepath -> target name -> function name -> function
  protected _functionMaps: Map<
    string,
    Map<string, Map<string, ContractFunction>>
  >;

  // Mapping: filepath -> target name -> (function name -> CFG)
  protected _controlFlowGraphs: Map<string, Map<string, CFG>>;

  // Mapping: filepath -> target name -> {importsMap, dependencyMap}
  protected _dependencyMaps: Map<
    string,
    Map<
      string,
      { importMap: Map<string, string>; dependencyMap: Map<string, Target[]> }
    >
  >;

  constructor(
    eventManager: EventManager<SolidityTestCase>,
    sourceGenerator: SourceGenerator,
    abtractSyntaxTreeGenerator: ASTGenerator,
    targetMapGenerator: TargetMapGenerator,
    controlFlowGraphGenerator: SolidityCFGFactory
  ) {
    super(eventManager);
    this._sourceGenerator = sourceGenerator;
    this._abstractSyntaxTreeGenerator = abtractSyntaxTreeGenerator;
    this._targetMapGenerator = targetMapGenerator;
    this._controlFlowGraphGenerator = controlFlowGraphGenerator;

    this._sources = new Map<string, string>();
    this._abstractSyntaxTrees = new Map<string, SourceUnit>();
    this._targetMap = new Map<string, Map<string, ContractMetadata>>();
    this._functionMaps = new Map<
      string,
      Map<string, Map<string, ContractFunction>>
    >();
    this._controlFlowGraphs = new Map<string, Map<string, CFG>>();

    this._dependencyMaps = new Map();
  }

  getSource(targetPath: string): string {
    const absoluteTargetPath = path.resolve(targetPath);

    if (this._sources.has(absoluteTargetPath)) {
      return this._sources.get(absoluteTargetPath);
    } else {
      const source = this._sourceGenerator.generate(absoluteTargetPath);
      this._sources.set(absoluteTargetPath, source);
      return source;
    }
  }

  getAST(targetPath: string): SourceUnit {
    const absoluteTargetPath = path.resolve(targetPath);

    if (this._abstractSyntaxTrees.has(absoluteTargetPath)) {
      return this._abstractSyntaxTrees.get(absoluteTargetPath);
    } else {
      const targetSource = this.getSource(absoluteTargetPath);
      const targetAST =
        this._abstractSyntaxTreeGenerator.generate(targetSource);
      this._abstractSyntaxTrees.set(absoluteTargetPath, targetAST);
      return targetAST;
    }
  }

  getTargetMap(targetPath: string): Map<string, ContractMetadata> {
    const absoluteTargetPath = path.resolve(targetPath);

    if (this._targetMap.has(absoluteTargetPath)) {
      return this._targetMap.get(absoluteTargetPath);
    } else {
      const targetAST = this.getAST(absoluteTargetPath);
      const { targetMap, functionMap } =
        this._targetMapGenerator.generate(targetAST);
      this._targetMap.set(absoluteTargetPath, targetMap);
      this._functionMaps.set(absoluteTargetPath, functionMap);
      return targetMap;
    }
  }

  getFunctionMap(
    targetPath: string
  ): Map<string, Map<string, ContractFunction>> {
    const absoluteTargetPath = path.resolve(targetPath);

    if (!this._functionMaps.has(absoluteTargetPath)) {
      const targetAST = this.getAST(absoluteTargetPath);
      const { targetMap, functionMap } =
        this._targetMapGenerator.generate(targetAST);
      this._targetMap.set(absoluteTargetPath, targetMap);
      this._functionMaps.set(absoluteTargetPath, functionMap);
    }

    return this._functionMaps.get(absoluteTargetPath);
  }

  getFunctionMapSpecific(
    targetPath: string,
    targetName: string
  ): Map<string, ContractFunction> {
    const absoluteTargetPath = path.resolve(targetPath);

    if (!this._functionMaps.has(absoluteTargetPath)) {
      const targetAST = this.getAST(absoluteTargetPath);
      const { targetMap, functionMap } =
        this._targetMapGenerator.generate(targetAST);
      this._targetMap.set(absoluteTargetPath, targetMap);
      this._functionMaps.set(absoluteTargetPath, functionMap);
    }

    if (this._functionMaps.get(absoluteTargetPath).has(targetName)) {
      return this._functionMaps.get(absoluteTargetPath).get(targetName);
    } else {
      throw new Error(
        `Target ${targetName} could not be found at ${targetPath}`
      );
    }
  }

  getCFG(targetPath: string, targetName: string): CFG {
    const absoluteTargetPath = path.resolve(targetPath);

    if (!this._controlFlowGraphs.has(absoluteTargetPath))
      this._controlFlowGraphs.set(absoluteTargetPath, new Map<string, CFG>());

    if (this._controlFlowGraphs.get(absoluteTargetPath).has(targetName)) {
      return this._controlFlowGraphs.get(absoluteTargetPath).get(targetName);
    } else {
      const targetAST = this.getAST(absoluteTargetPath);
      const cfg = this._controlFlowGraphGenerator.convertAST(
        targetAST,
        false,
        false
      );
      this._controlFlowGraphs.get(absoluteTargetPath).set(targetName, cfg);
      return cfg;
    }
  }

  getImportDependencies(
    targetPath: string,
    targetName: string
  ): { importMap: Map<string, string>; dependencyMap: Map<string, Target[]> } {
    const absoluteTargetPath = path.resolve(targetPath);

    if (!this._dependencyMaps.has(absoluteTargetPath))
      this._dependencyMaps.set(absoluteTargetPath, new Map());

    if (this._dependencyMaps.get(absoluteTargetPath).has(targetName)) {
      return this._dependencyMaps.get(absoluteTargetPath).get(targetName);
    } else {
      // Import the contract under test
      const importMap = new Map<string, string>();
      importMap.set(targetName, targetName);

      // Find all external imports in the contract under test
      const importVisitor = new ImportVisitor();
      SolidityParser.visit(this.getAST(targetPath), importVisitor);

      // For each external import scan the file for libraries with public and external functions
      const libraries: Target[] = [];
      importVisitor.getImports().forEach((importPath: string) => {
        // Full path to the imported file
        const pathLib = path.join(path.dirname(targetPath), importPath);

        // Read the imported file
        // TODO: use the already parsed excluded information to prevent duplicate file reading
        const source = fs.readFileSync(pathLib).toString();

        // Parse the imported file
        const astLib = SolidityParser.parse(source, {
          loc: true,
          range: true,
        });

        // Scan for libraries with public or external functions
        const libraryVisitor = new LibraryVisitor();
        SolidityParser.visit(astLib, libraryVisitor);

        // Import the external file in the test
        importMap.set(
          path.basename(importPath).split(".")[0],
          path.basename(importPath).split(".")[0]
        );

        // Import the found libraries
        // TODO: check for duplicates in libraries
        libraries.push(
          ...libraryVisitor.libraries.map((l) => {
            return {
              canonicalPath: pathLib,
              targetName: l,
            };
          })
        );
      });

      // Return the library dependency information
      const dependencyMap = new Map<string, Target[]>();
      dependencyMap.set(targetName, libraries);

      this._dependencyMaps
        .get(targetPath)
        .set(targetName, { importMap, dependencyMap });
      return { importMap, dependencyMap };
    }
  }

  // eslint-disable-next-line
  async prepareAndInstrument(api: any): Promise<void> {
    const absoluteRootPath = path.resolve(CONFIG.targetRootDirectory);

    const destinationPath = path.resolve(
      CONFIG.tempInstrumentedDirectory,
      path.basename(CONFIG.targetRootDirectory)
    );

    // copy everything
    await copySync(absoluteRootPath, destinationPath);

    // overwrite the stuff that needs instrumentation
    // const instrumenter = new Instrumenter();

    const targetPaths = this.targets.map((x) => x.canonicalPath);

    for (const targetPath of targetPaths) {
      const source = this.getSource(targetPath);
      const instrumented = await api.instrumenter.instrument(
        source,
        targetPath
      );

      api.coverage.addContract(instrumented, targetPath);

      const _path = path
        .normalize(targetPath)
        .replace(absoluteRootPath, destinationPath);

      await outputFileSync(_path, instrumented.contract);
    }
  }
}
