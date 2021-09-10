import { TargetPool } from "../TargetPool";
import { ContractMetadata, ContractKind } from "../map/ContractMetadata";
import { ContractFunction, ExternalVisibility } from "../map/ContractFunction";
import * as path from "path";
import { TargetContext } from "./TargetContext";
import { ImportVisitor } from "./ImportVisitor";
import { Graph } from "../Graph";
import { PublicVisibility } from "syntest-framework";

const SolidityParser = require("@solidity-parser/parser");

/**
 * Analyzer that discovers all dependencies in the target.
 *
 * @author Mitchell Olsthoorn
 */
export class DependencyAnalyzer {
  protected _targetPool: TargetPool;

  constructor(targetPool: TargetPool) {
    this._targetPool = targetPool;
  }

  /**
   * Analyzes the import dependencies in the given target file.
   *
   * @param targetPath The target file to analyze
   */
  analyzeImports(targetPath: string): Graph<string> {
    const importGraph = new Graph<string>();

    const queue: string[] = [];
    queue.push(path.resolve(targetPath));

    while (queue.length != 0) {
      // Traverse queue breadth-first
      const filePath = queue.shift();

      importGraph.addNode(filePath);

      const ast = this._targetPool.getAST(filePath);
      const visitor = new ImportVisitor();
      SolidityParser.visit(ast, visitor);

      const imports = visitor.getImports();
      imports
        .map((foundImportPath) => {
          // Resolve relative path
          return path.resolve(path.dirname(filePath), foundImportPath);
        })
        .forEach((foundAbsoluteImportPath) => {
          if (!queue.includes(foundAbsoluteImportPath))
            queue.push(foundAbsoluteImportPath);

          importGraph.addEdge(filePath, foundAbsoluteImportPath);
        });
    }

    return importGraph;
  }

  /**
   * Analyze the context of a target.
   *
   * @param importGraph The import graph of the target
   */
  analyzeContext(importGraph: Graph<string>): TargetContext<ContractMetadata> {
    const targetContext = new TargetContext<ContractMetadata>();

    const nodes = importGraph.getNodes();
    nodes.forEach((currentImport) => {
      const targetMap = this._targetPool.getTargetMap(currentImport);
      targetMap.forEach(
        (contractMetadata: ContractMetadata, contractName: string) => {
          targetContext.add(currentImport, contractName, contractMetadata);
        }
      );
    });

    return targetContext;
  }

  /**
   * Analyze the inheritance of a target.
   *
   * @param targetContext The context of the target
   * @param targetName The name of the target
   */
  analyzeInheritance(
    targetContext: TargetContext<ContractMetadata>,
    targetName: string
  ): Graph<string> {
    const inheritanceGraph = new Graph<string>();

    const queue: { targetName: string; parentName: string }[] = [];

    // Add current target as initial node in the queue
    queue.push({
      targetName: targetName,
      parentName: null,
    });

    while (queue.length != 0) {
      // Traverse queue breadth-first
      const queueEntry = queue.shift();

      inheritanceGraph.addNode(queueEntry.targetName);

      // If entry has parent add it to the graph
      if (queueEntry.parentName != null)
        inheritanceGraph.addEdge(queueEntry.parentName, queueEntry.targetName);

      // Retrieve target metadata
      const targetMetadata = targetContext.getTarget(queueEntry.targetName);

      // Add all bases to the queue
      targetMetadata.bases.forEach((base) => {
        queue.push({
          targetName: base,
          parentName: queueEntry.targetName,
        });
      });
    }

    return inheritanceGraph;
  }

  /**
   * Analyze the linking of a target.
   *
   * @param importGraph The import graph of the target
   * @param targetContext The context of the target
   * @param targetName The name of the target
   */
  analyzeLinking(
    importGraph: Graph<string>,
    targetContext: TargetContext<ContractMetadata>,
    targetName: string
  ): Graph<string> {
    const linkingGraph = new Graph<string>();

    if (targetContext.getLocation(targetName) == null)
      throw new Error(`Target ${targetName} not found`);

    const queue: { targetPath: string; targetNames: string[] }[] = [];
    queue.push({
      targetPath: targetContext.getLocation(targetName),
      targetNames: [targetName],
    });

    while (queue.length != 0) {
      // Traverse queue breadth-first
      const queueEntry = queue.shift();

      // Initialize the linking graph nodes
      queueEntry.targetNames.forEach((name) => {
        linkingGraph.addNode(name);
      });

      // Loop over all imports
      const adjacentNodes = importGraph.getAdjacentNodes(queueEntry.targetPath);
      adjacentNodes.forEach((importedFilePath) => {
        const linkedContracts = new Set<string>();

        const contracts = this._targetPool.getTargetMap(importedFilePath);
        contracts.forEach((contractMetadata: ContractMetadata) => {
          if (contractMetadata.kind === ContractKind.Library) {
            const functions = this._targetPool.getFunctionMap(
              importedFilePath,
              contractMetadata.name
            );
            functions.forEach((contractFunction: ContractFunction) => {
              // Add library if it has public or external functions
              if (
                contractFunction.visibility === PublicVisibility ||
                contractFunction.visibility === ExternalVisibility
              ) {
                linkedContracts.add(contractMetadata.name);
              }
            });
          }
        });

        // Add found public or external libraries to the linking graph
        queueEntry.targetNames.forEach((name) => {
          linkedContracts.forEach((linkedContract) => {
            linkingGraph.addEdge(name, linkedContract);
          });
        });

        // Push found imports on the queue
        queue.push({
          targetPath: importedFilePath,
          // If no public or external libraries where found add the current ones
          targetNames:
            linkedContracts.size == 0
              ? queueEntry.targetNames
              : [...linkedContracts],
        });
      });
    }

    return linkingGraph;
  }
}
