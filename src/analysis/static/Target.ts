import { SearchSubject, TestCase } from "syntest-framework";
import { TargetPool } from "./TargetPool";
import * as path from "path";
import { DependencyAnalyzer } from "./dependency/DependencyAnalyzer";
import { TargetContext } from "./dependency/TargetContext";
import { ContractMetadata } from "./map/ContractMetadata";
import { Graph } from "./Graph";

/**
 * Target system under test.
 *
 * This class contains all data related to the target system.
 *
 * @author Mitchell Olsthoorn
 */
export class Target {
  protected readonly _path: string;
  protected readonly _name: string;

  // Mapping: filepath -> source
  protected _sources: Map<string, string>;

  // Mapping: filepath -> AST
  protected _abstractSyntaxTrees: Map<string, any>;

  protected _context: TargetContext<ContractMetadata>;

  // Mapping: target name -> function name -> function
  protected _functions: Map<string, Map<string, any>>;

  // Mapping: target name -> (function name -> CFG)
  protected _controlFlowGraphs: Map<string, any>;

  protected _linkingGraph: Graph<string>;

  protected _subject: SearchSubject<TestCase>;

  constructor(
    targetPath: string,
    targetName: string,
    sources: Map<string, string>,
    ASTs: Map<string, any>,
    context: TargetContext<ContractMetadata>,
    functions: Map<string, Map<string, any>>,
    CFGs: Map<string, any>,
    linkingGraph: Graph<string>
  ) {
    this._path = path.resolve(targetPath);
    this._name = targetName;
    this._sources = sources;
    this._abstractSyntaxTrees = ASTs;
    this._context = context;
    this._functions = functions;
    this._controlFlowGraphs = CFGs;
    this._linkingGraph = linkingGraph;
  }

  /**
   * Create a target from the target pool.
   *
   * @param targetPool The target pool to load the target information from
   * @param targetPath The path to the target file
   * @param targetName the name of the target
   */
  static fromPool(
    targetPool: TargetPool,
    targetPath: string,
    targetName: string
  ): Target {
    const absoluteTargetPath = path.resolve(targetPath);

    // Get source, AST, FunctionMap, and CFG for target under test
    const sources = new Map<string, string>();
    const abstractSyntaxTrees = new Map<string, any>();
    const functionMaps = new Map<string, Map<string, any>>();
    const controlFlowGraphs = new Map<string, any>();

    sources.set(absoluteTargetPath, targetPool.getSource(absoluteTargetPath));
    abstractSyntaxTrees.set(
      absoluteTargetPath,
      targetPool.getAST(absoluteTargetPath)
    );
    functionMaps.set(
      targetName,
      targetPool.getFunctionMap(absoluteTargetPath, targetName)
    );
    controlFlowGraphs.set(
      targetName,
      targetPool.getCFG(absoluteTargetPath, targetName)
    );

    // Analyze dependencies
    const analyzer = new DependencyAnalyzer(targetPool);

    const importGraph = analyzer.analyzeImports(targetPath);
    const context = analyzer.analyzeContext(importGraph);
    const inheritanceGraph = analyzer.analyzeInheritance(context, targetName);

    const nodes = importGraph.getNodes();
    nodes.forEach((filePath) => {
      sources.set(filePath, targetPool.getSource(filePath));
      abstractSyntaxTrees.set(filePath, targetPool.getAST(filePath));

      context.getTargets(filePath).forEach((contractMetadata) => {
        functionMaps.set(
          contractMetadata.name,
          targetPool.getFunctionMap(filePath, contractMetadata.name)
        );
      });
    });

    const linkingGraph = analyzer.analyzeLinking(
      importGraph,
      context,
      targetName
    );

    return new Target(
      absoluteTargetPath,
      targetName,
      sources,
      abstractSyntaxTrees,
      context,
      functionMaps,
      controlFlowGraphs,
      linkingGraph
    );
  }

  get path(): string {
    return this._path;
  }

  get name(): string {
    return this._name;
  }

  getSources(targetPath: string): string {
    return this._sources.get(targetPath);
  }

  getAST(targetPath: string): any {
    return this._abstractSyntaxTrees.get(targetPath);
  }

  getContext(): TargetContext<ContractMetadata> {
    return this._context;
  }

  getFunctions(targetName: string): Map<string, any> {
    return this._functions.get(targetName);
  }

  getCFG(targetName: string): any {
    return this._controlFlowGraphs.get(targetName);
  }

  getLinkingGraph(): Graph<string> {
    return this._linkingGraph;
  }
}
