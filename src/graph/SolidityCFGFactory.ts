/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
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

import {
  CFG,
  Node,
  RootNode,
  BranchNode,
  PlaceholderNode,
  Visibility,
  Operation,
  Edge,
  CFGFactory,
  Properties,
  Parameter,
  PrivateVisibility,
  PublicVisibility,
  NodeType,
} from "syntest-framework";
import {
  ExternalVisibility,
  InternalVisibility,
} from "../analysis/static/map/ContractFunction";
import { ContractVisitor } from "../analysis/static/map/ContractVisitor";

// TODO break and continue statements

interface ReturnValue {
  childNodes: Node[];
  breakNodes: Node[];
}

/**
 * @author Dimitri Stallenberg
 */
export class SolidityCFGFactory implements CFGFactory {
  get contracts(): string[] {
    return this._contracts;
  }
  private count = 0;
  private modifierMap = new Map();
  private _contracts: string[] = [];

  convertAST(AST: any, compress = true, placeholder = false): CFG {
    this.count = 0;
    this._contracts = [];

    const cfg = new CFG();

    this.visitChild(cfg, AST, []);

    if (!placeholder) {
      this.removePlaceholder(cfg);
    }

    if (compress) {
      this.compress(cfg);
    }

    return cfg;
  }

  removePlaceholder(cfg: CFG): void {
    const removableEdges = [];
    const removableNodes = [];
    cfg.nodes
      // Find all placeholder nodes
      .filter((n) => n.type === NodeType.Placeholder)
      .forEach((placeholderNode) => {
        cfg.edges
          // Find all placeholder nodes that are not end nodes
          .filter((edge) => edge.from === placeholderNode.id)
          .forEach((outgoingEdge) => {
            const targetNode = outgoingEdge.to;
            cfg.edges
              // Find all incoming edges from the current placeholder node
              .filter((edge) => edge.to === placeholderNode.id)
              // Connect the incoming and outgoing nodes together
              .forEach((incomingEdge) => {
                incomingEdge.to = targetNode;
              });

            // Only delete the edge from the placeholder node
            // There could be other nodes pointing to the target node
            removableEdges.push(outgoingEdge);
            if (!removableNodes.includes(placeholderNode))
              removableNodes.push(placeholderNode);
          });
      });

    // Delete unneeded placeholder elements
    removableEdges.forEach((edge) => {
      cfg.edges.splice(cfg.edges.indexOf(edge), 1);
    });
    removableNodes.forEach((node) => {
      cfg.nodes.splice(cfg.nodes.indexOf(node), 1);
    });
  }

  // contractEdges(cfg: CFG): void {
  //   cfg.nodes
  //     // Find all placeholder nodes
  //     .filter((n) => !(n.branch || n.probe))
  //     .forEach((placeholderNode) => {
  //       cfg.edges
  //         // Find all placeholder nodes that are not end nodes
  //         .filter((edge) => edge.from === placeholderNode.id)
  //         .forEach((outgoingEdge) => {
  //           const targetNode = outgoingEdge.to
  //           cfg.edges
  //             // Find all incoming edges from the current placeholder node
  //             .filter((edge) => edge.to === placeholderNode.id)
  //             // Connect the incoming and outgoing nodes together
  //             .forEach((incomingEdge) => {
  //               incomingEdge.to = targetNode
  //             })
  //
  //           // Only delete the edge from the placeholder node
  //           // There could be other nodes pointing to the target node
  //           removableEdges.push(outgoingEdge)
  //           if (!removableNodes.includes(placeholderNode))
  //             removableNodes.push(placeholderNode)
  //         });
  //     })
  // }

  compress(cfg: CFG): void {
    const roots = cfg.nodes.filter((n) => n.type === NodeType.Root);

    // create  node map for easy lookup
    const nodeMap = new Map<string, Node>();
    for (const node of cfg.nodes) {
      nodeMap[node.id] = node;
    }

    // create outgoing edge map for easy lookup
    const outEdgeMap = new Map<string, string[]>();
    for (const edge of cfg.edges) {
      if (!outEdgeMap[edge.from]) {
        outEdgeMap[edge.from] = [];
      }
      outEdgeMap[edge.from].push(edge.to);
    }

    const discoveredMap = new Map<string, boolean>();

    const removedNodes = [];
    // const removedEdges = []

    let possibleCompression = [];
    for (const root of roots) {
      const stack: Node[] = [root];
      while (stack.length != 0) {
        const currentNode = stack.pop();
        const outGoingEdges = outEdgeMap[currentNode.id] || [];

        if (outGoingEdges.length === 1) {
          // exactly one next node so compression might be possible
          possibleCompression.push(currentNode);
        } else if (outGoingEdges.length !== 1) {
          // zero or more than one outgoing edges so the compression ends here
          const description = [];

          const incomingEdges: Edge[][] = [];

          for (let i = 0; i < possibleCompression.length - 1; i++) {
            const node = possibleCompression[i];
            if (node.root) {
              // do not remove root nodes
              continue;
            }

            removedNodes.push(node);
            description.push(node.line);

            incomingEdges.push(cfg.edges.filter((e) => e.to === node.id));
          }

          if (possibleCompression.length > 0) {
            let nodeId = currentNode.id;
            if (outGoingEdges.length === 0) {
              // no next nodes so we can also remove the last one
              const lastNode =
                possibleCompression[possibleCompression.length - 1];
              // unless it is a root node
              if (!lastNode.root) {
                removedNodes.push(lastNode);
                description.push(lastNode.line);

                incomingEdges.push(
                  cfg.edges.filter((e) => e.to === lastNode.id)
                );
              }

              // change the current node to be the compressed version of all previous nodes
              currentNode.description = description.join(", ");
            } else {
              // change the current node to be the compressed version of all previous nodes
              possibleCompression[possibleCompression.length - 1].description =
                description.join(", ");
              nodeId = possibleCompression[possibleCompression.length - 1].id;
            }

            // change the edges pointing to any of the removed nodes
            for (const edges of incomingEdges) {
              for (const edge of edges) {
                edge.to = nodeId;
              }
            }
          }

          // reset compression
          possibleCompression = [];
        }

        if (!discoveredMap[currentNode.id]) {
          discoveredMap[currentNode.id] = true;
          for (const to of outGoingEdges) {
            stack.push(nodeMap[to]);
          }
        }
      }

      // reset compressions before going to the next root
      possibleCompression = [];
    }

    cfg.nodes = cfg.nodes.filter((n) => !removedNodes.includes(n));
    // remove edges of which the to/from has been removed
    cfg.edges = cfg.edges.filter(
      (e) => !removedNodes.find((n) => n.id === e.to || n.id === e.from)
    );

    // TODO also remove unreachable code
  }

  /**
   * This method creates edges to connect the given parents to the given children
   * @param cfg the cfg to add the edges to
   * @param parents the parent nodes
   * @param children the child nodes
   * @private
   */
  private connectParents(cfg: CFG, parents: Node[], children: Node[]) {
    for (const parent of parents) {
      for (const child of children) {
        cfg.edges.push({
          from: parent.id,
          to: child.id,
        });
      }
    }
  }

  /**
   * This method creates a new node in the cfg
   * @param cfg the cfg to add the node to
   * @param lines
   * @param statements
   * @param branch whether this nodes is a branching node (i.e. multiple outgoing edges)
   * @param probe
   * @param condition if it is a branch node this is the condition to branch on
   * @param placeholder
   * @private
   */
  private createNode(cfg: CFG, lines: number[], statements: string[]): Node {
    const node: Node = {
      type: NodeType.Intermediary,
      id: `${this.count++}`,
      lines: lines,
      statements: statements,
    };

    cfg.nodes.push(node);

    return node;
  }

  private createPlaceholderNode(
    cfg: CFG,
    lines: number[],
    statements: string[]
  ): PlaceholderNode {
    const node: PlaceholderNode = {
      type: NodeType.Placeholder,
      id: `${this.count++}`,
      lines: lines,
      statements: statements,
    };

    cfg.nodes.push(node);

    return node;
  }

  private createBranchNode(
    cfg: CFG,
    lines: number[],
    statements: string[],
    condition: Operation,
    probe = false
  ): BranchNode {
    const node: BranchNode = {
      condition: condition,
      id: `${this.count++}`,
      lines: lines,
      statements: statements,
      type: NodeType.Branch,
      probe: probe,
    };

    cfg.nodes.push(node);

    return node;
  }

  private getVisibility(text: string): Visibility {
    switch (text) {
      case "public":
        return PublicVisibility;
      case "private":
        return PrivateVisibility;
      case "internal":
        return InternalVisibility;
      case "external":
        return ExternalVisibility;
    }

    throw new Error("Invalid visibility string!");
  }

  private createRootNode(
    cfg: CFG,
    lines: number[],
    statements: string[],
    contractName: string,
    functionName: string,
    isConstructor: boolean,
    parameters: Parameter[],
    returnParameters: Parameter[],
    visibility: string
  ): RootNode {
    const node: RootNode = {
      contractName: contractName,
      functionName: functionName,
      id: `${this.count++}`,
      isConstructor: isConstructor,
      lines: lines,
      statements: statements,
      type: NodeType.Root,

      parameters: parameters,
      returnParameters: returnParameters,

      visibility: this.getVisibility(visibility),
    };

    cfg.nodes.push(node);

    return node;
  }

  /**
   * This method visit a child node in the AST using the visitor design pattern.
   *
   * @param cfg the Control Flow Graph we are generating
   * @param child the child AST node
   * @param parents the parents of the child
   * @param contractName
   * @private
   */
  private visitChild(
    cfg: CFG,
    child: any,
    parents: Node[],
    contractName?: string
  ): ReturnValue {
    const skipable: string[] = [
      "PragmaDirective",
      "StateVariableDeclaration",
      "ImportDirective", // TODO maybe we should also connect the other contract?
      "EventDefinition", // TODO ternary/conditionals
      "EmitStatement", // TODO ternary/conditionals
      "StructDefinition", // TODO ternary/conditionals
      "UsingForDeclaration", // TODO ternary/conditionals
      "InlineAssemblyStatement", // TODO ternary/conditionals
      "Identifier",
      "UnaryOperation",
      "BinaryOperation",
      "TupleExpression",
      "StringLiteral",
      "BooleanLiteral",
      "NumberLiteral",
      "IndexAccess",
      "MemberAccess",
      "TypeNameExpression", // Is used in the benchmark
      "EnumDefinition", // Is used in the framework
    ];

    if (skipable.includes(child.type)) {
      return {
        childNodes: parents,
        breakNodes: [],
      };
    }

    switch (child.type) {
      case "SourceUnit":
        return this.SourceUnit(cfg, child);
      case "ContractDefinition":
        return this.ContractDefinition(cfg, child);
      case "ModifierDefinition":
        return this.ModifierDefinition(cfg, child);
      case "FunctionDefinition":
        return this.FunctionDefinition(cfg, child, contractName);
      case "ModifierInvocation":
        return this.ModifierInvocation(cfg, child, parents);
      case "Block":
        return this.Block(cfg, child, parents);

      case "IfStatement":
        return this.IfStatement(cfg, child, parents);
      case "Conditional":
        return this.Conditional(cfg, child, parents);

      case "ForStatement":
        return this.ForStatement(cfg, child, parents);
      case "WhileStatement":
        return this.WhileStatement(cfg, child, parents);
      case "DoWhileStatement":
        return this.DoWhileStatement(cfg, child, parents);

      case "VariableDeclarationStatement":
        return this.VariableDeclarationStatement(cfg, child, parents);
      case "ExpressionStatement":
        return this.ExpressionStatement(cfg, child, parents);
      case "FunctionCall":
        return this.FunctionCall(cfg, child, parents);
      case "ReturnStatement":
        return this.ReturnStatement(cfg, child, parents);
      case "BreakStatement":
        return this.BreakStatement(cfg, child, parents);

      default:
        console.log(child);
        throw new Error(`AST type: ${child.type} is not supported currently!`);
    }
  }

  private SourceUnit(cfg: CFG, AST: any): ReturnValue {
    for (const child of AST.children) {
      // TODO: Add child nodes to results
      this.visitChild(cfg, child, []);
    }

    return {
      childNodes: [],
      breakNodes: [],
    };
  }

  private ContractDefinition(cfg: CFG, AST: any): ReturnValue {
    this._contracts.push(AST.name);

    for (const child of AST.subNodes) {
      // TODO: Add child nodes to results
      this.visitChild(cfg, child, [], AST.name);
    }

    return {
      childNodes: [],
      breakNodes: [],
    };
  }

  private ModifierDefinition(cfg: CFG, AST: any): ReturnValue {
    this.modifierMap.set(AST.name, AST.body);

    return {
      childNodes: [],
      breakNodes: [],
    };
  }

  private parseParameter(parameter): Parameter {
    return {
      name: parameter.name,
      type: ContractVisitor.resolveTypes(parameter.typeName),
    };
  }

  private FunctionDefinition(
    cfg: CFG,
    AST: any,
    contractName: string
  ): ReturnValue {
    const node: RootNode = this.createRootNode(
      cfg,
      [AST.loc.start.line],
      [],
      contractName,
      AST.name || contractName,
      AST.isConstructor,
      AST.parameters.map(this.parseParameter),
      AST.returnParameters ? AST.returnParameters.map(this.parseParameter) : [],
      AST.visibility
    );

    // TODO parameters
    // TODO return parameters

    let parents: Node[] = [node];

    const totalBreakNodes = [];
    if (AST.modifiers && Properties.modifier_extraction) {
      AST.modifiers.forEach((modifier) => {
        const { childNodes, breakNodes } = this.visitChild(
          cfg,
          modifier,
          parents
        );
        if (childNodes.length > 0) {
          parents = childNodes;
        }
        totalBreakNodes.push(...breakNodes);
      });
    }

    // Check if body is block
    if (AST.body) {
      // TODO: Add child nodes to results
      this.visitChild(cfg, AST.body, parents);
    }

    return {
      childNodes: [],
      breakNodes: [],
    };
  }

  private ModifierInvocation(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    if (this.modifierMap.has(AST.name)) {
      const { childNodes, breakNodes } = this.visitChild(
        cfg,
        this.modifierMap.get(AST.name),
        parents
      );
      return {
        childNodes: childNodes,
        breakNodes: breakNodes,
      };
    } else {
      return {
        childNodes: [],
        breakNodes: [],
      };
    }
  }

  private Block(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    let nodes = parents;

    const totalBreakNodes = [];
    for (const child of AST.statements) {
      const { childNodes, breakNodes } = this.visitChild(cfg, child, nodes);
      nodes = childNodes;
      totalBreakNodes.push(...breakNodes);
    }

    return {
      childNodes: nodes,
      breakNodes: totalBreakNodes,
    };
  }

  private IfStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    const node: BranchNode = this.createBranchNode(
      cfg,
      [AST.loc.start.line],
      [],
      {
        type: AST.condition.type,
        operator: AST.condition.operator,
      }
    );

    this.connectParents(cfg, parents, [node]);

    // Store all break points
    const totalBreakNodes = [];

    // Visit true flow
    let count = cfg.edges.length;
    const { childNodes, breakNodes } = this.visitChild(cfg, AST.trueBody, [
      node,
    ]);
    const trueNodes = childNodes;
    totalBreakNodes.push(...breakNodes);

    // Check if a child node was created
    if (cfg.edges[count]) {
      // Add edge type to first added edge
      cfg.edges[count].branchType = true;
    } else {
      // Add empty placeholder node
      const emptyChildNode = this.createPlaceholderNode(
        cfg,
        [AST.trueBody.loc.start.line],
        []
      );
      trueNodes.push(emptyChildNode);

      cfg.edges.push({
        from: node.id,
        to: emptyChildNode.id,
        branchType: true,
      });
    }

    // Visit false flow
    if (AST.falseBody) {
      count = cfg.edges.length;
      const { childNodes, breakNodes } = this.visitChild(cfg, AST.falseBody, [
        node,
      ]);
      const falseNodes = childNodes;
      totalBreakNodes.push(...breakNodes);

      // Check if a child node was created
      if (cfg.edges[count]) {
        // Add edge type to first added edge
        cfg.edges[count].branchType = false;
      } else {
        // Add empty placeholder node
        const emptyChildNode = this.createPlaceholderNode(
          cfg,
          [AST.falseBody.loc.start.line],
          []
        );
        falseNodes.push(emptyChildNode);

        cfg.edges.push({
          from: node.id,
          to: emptyChildNode.id,
          branchType: false,
        });
      }

      return {
        childNodes: [...trueNodes, ...falseNodes],
        breakNodes: totalBreakNodes,
      };
    } else {
      // Add empty placeholder node
      const falseNode: Node = this.createPlaceholderNode(
        cfg,
        [AST.loc.end.line],
        []
      );

      cfg.edges.push({
        from: node.id,
        to: falseNode.id,
        branchType: false,
      });

      return {
        childNodes: [...trueNodes, falseNode],
        breakNodes: totalBreakNodes,
      };
    }
  }

  private Conditional(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    const node: Node = this.createBranchNode(cfg, [AST.loc.start.line], [], {
      type: AST.condition.type,
      operator: AST.condition.operator,
    });
    this.connectParents(cfg, parents, [node]);

    // Store all break points
    const totalBreakNodes = [];

    // Visit true flow
    let count = cfg.edges.length;
    const { childNodes, breakNodes } = this.visitChild(
      cfg,
      AST.trueExpression,
      [node]
    );
    const trueNodes = childNodes;
    totalBreakNodes.push(...breakNodes);

    // Check if a child node was created
    if (cfg.edges[count]) {
      // Add edge type to first added edge
      cfg.edges[count].branchType = true;
    } else {
      // Add empty placeholder node
      const emptyChildNode = this.createPlaceholderNode(
        cfg,
        [AST.trueExpression.loc.start.line],
        []
      );
      trueNodes.push(emptyChildNode);

      cfg.edges.push({
        from: node.id,
        to: emptyChildNode.id,
        branchType: true,
      });
    }

    // Visit false flow
    if (AST.falseBody) {
      count = cfg.edges.length;
      const { childNodes, breakNodes } = this.visitChild(
        cfg,
        AST.falseExpression,
        [node]
      );
      const falseNodes = childNodes;
      totalBreakNodes.push(...breakNodes);

      // Check if a child node was created
      if (cfg.edges[count]) {
        // Add edge type to first added edge
        cfg.edges[count].branchType = false;
      } else {
        // Add empty placeholder node
        const emptyChildNode = this.createPlaceholderNode(
          cfg,
          [AST.falseExpression.loc.start.line],
          []
        );
        falseNodes.push(emptyChildNode);

        cfg.edges.push({
          from: node.id,
          to: emptyChildNode.id,
          branchType: false,
        });
      }

      return {
        childNodes: [...trueNodes, ...falseNodes],
        breakNodes: totalBreakNodes,
      };
    } else {
      // Add empty placeholder node
      const falseNode = this.createPlaceholderNode(cfg, [AST.loc.end.line], []);

      cfg.edges.push({
        from: node.id,
        to: falseNode.id,
        branchType: false,
      });

      return {
        childNodes: [...trueNodes, falseNode],
        breakNodes: totalBreakNodes,
      };
    }
  }

  private ForStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    const node: Node = this.createBranchNode(cfg, [AST.loc.start.line], [], {
      type: AST.conditionExpression.type,
      operator: AST.conditionExpression.operator,
    });
    this.connectParents(cfg, parents, [node]);
    // TODO For each probably not supported

    // TODO init expression
    // TODO condition expression
    // TODO loopExpression

    const count = cfg.edges.length;
    const { childNodes, breakNodes } = this.visitChild(cfg, AST.body, [node]);
    const trueNodes = childNodes;

    // Check if a child node was created
    if (cfg.edges[count]) {
      // Add edge type to first added edge
      cfg.edges[count].branchType = true;
    } else {
      // Add empty placeholder node
      const emptyChildNode = this.createPlaceholderNode(
        cfg,
        [AST.loc.start.line],
        []
      );
      trueNodes.push(emptyChildNode);

      cfg.edges.push({
        from: node.id,
        to: emptyChildNode.id,
        branchType: true,
      });
    }

    // Add empty placeholder node for the false flow
    const falseNode = this.createPlaceholderNode(cfg, [AST.loc.end.line], []);
    cfg.edges.push({
      from: node.id,
      to: falseNode.id,
      branchType: false,
    });

    // Connect break points
    for (const breakNode of breakNodes) {
      cfg.edges.push({
        from: breakNode.id,
        to: falseNode.id,
      });
    }

    // Connect loop
    this.connectParents(cfg, trueNodes, [node]);

    return {
      childNodes: [falseNode],
      breakNodes: [],
    };
  }

  private WhileStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    const node: Node = this.createBranchNode(cfg, [AST.loc.start.line], [], {
      type: AST.condition.type,
      operator: AST.condition.operator,
    });
    this.connectParents(cfg, parents, [node]);

    const count = cfg.edges.length;
    const { childNodes, breakNodes } = this.visitChild(cfg, AST.body, [node]);
    const trueNodes = childNodes;

    // Check if a child node was created
    if (cfg.edges[count]) {
      // Add edge type to first added edge
      cfg.edges[count].branchType = true;
    } else {
      // Add empty placeholder node
      const emptyChildNode = this.createPlaceholderNode(
        cfg,
        [AST.loc.start.line],
        []
      );
      trueNodes.push(emptyChildNode);

      cfg.edges.push({
        from: node.id,
        to: emptyChildNode.id,
        branchType: true,
      });
    }

    // Add empty placeholder node for the false flow
    const falseNode = this.createPlaceholderNode(cfg, [AST.loc.end.line], []);
    cfg.edges.push({
      from: node.id,
      to: falseNode.id,
      branchType: false,
    });

    // Connect break points
    for (const breakNode of breakNodes) {
      cfg.edges.push({
        from: breakNode.id,
        to: falseNode.id,
      });
    }

    // Connect loop
    this.connectParents(cfg, trueNodes, [node]);

    return {
      childNodes: [falseNode],
      breakNodes: [],
    };
  }

  // TODO: figure this out
  private DoWhileStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    // entry node
    const entryNode: Node = this.createBranchNode(
      cfg,
      [AST.loc.start.line],
      [],
      {
        type: AST.condition.type,
        operator: AST.condition.operator,
      }
    );
    this.connectParents(cfg, parents, [entryNode]);

    // TODO: We can check if a node is generated. This eliminates the need for entryNode
    // 'do' block
    const { childNodes, breakNodes } = this.visitChild(cfg, AST.body, [
      entryNode,
    ]);
    const trueNodes = childNodes;

    // while check
    const whileNode: Node = this.createBranchNode(
      cfg,
      [AST.loc.start.line],
      [],
      {
        type: AST.condition.type,
        operator: AST.condition.operator,
      }
    );
    this.connectParents(cfg, trueNodes, [whileNode]);

    // Connect back to the entry node and mark as true branch
    cfg.edges.push({
      from: whileNode.id,
      to: entryNode.id,
      branchType: true,
    });

    // Add empty placeholder node for the false flow
    const falseNode: Node = this.createPlaceholderNode(
      cfg,
      [AST.loc.end.line],
      []
    );
    cfg.edges.push({
      from: whileNode.id,
      to: falseNode.id,
      branchType: false,
    });

    // Connect break points
    for (const breakNode of breakNodes) {
      cfg.edges.push({
        from: breakNode.id,
        to: falseNode.id,
      });
    }

    return {
      childNodes: [falseNode],
      breakNodes: [],
    };
  }

  private VariableDeclarationStatement(
    cfg: CFG,
    AST: any,
    parents: Node[]
  ): ReturnValue {
    const node: Node = this.createNode(cfg, [AST.loc.start.line], []);
    this.connectParents(cfg, parents, [node]);

    return {
      childNodes: [node],
      breakNodes: [],
    };
  }

  private ExpressionStatement(
    cfg: CFG,
    AST: any,
    parents: Node[]
  ): ReturnValue {
    if (AST.expression.type === "FunctionCall") {
      const { childNodes, breakNodes } = this.visitChild(
        cfg,
        AST.expression,
        parents
      );

      return {
        childNodes: childNodes,
        breakNodes: breakNodes,
      };
    } else {
      const node: Node = this.createNode(cfg, [AST.loc.start.line], []);
      this.connectParents(cfg, parents, [node]);

      const { childNodes, breakNodes } = this.visitChild(cfg, AST.expression, [
        node,
      ]);

      return {
        childNodes: childNodes,
        breakNodes: breakNodes,
      };
    }
  }

  private FunctionCall(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    // In any given chain of call expressions, only the last one will fail this check.
    // This makes sure we don't instrument a chain of expressions multiple times.
    if (AST.expression.type !== "FunctionCall") {
      if (AST.expression.name === "require" && Properties.probe_objective) {
        const node: Node = this.createBranchNode(
          cfg,
          [AST.loc.start.line],
          [],
          {
            type: AST.arguments[0].type,
            operator: AST.arguments[0].operator,
          },
          true
        );
        this.connectParents(cfg, parents, [node]);

        const trueNode: Node = this.createPlaceholderNode(
          cfg,
          [AST.loc.end.line],
          []
        );
        cfg.edges.push({
          from: node.id,
          to: trueNode.id,
          branchType: true,
        });

        const falseNode: Node = this.createNode(cfg, [AST.loc.end.line], []);
        cfg.edges.push({
          from: node.id,
          to: falseNode.id,
          branchType: false,
        });

        const { childNodes, breakNodes } = this.visitChild(
          cfg,
          AST.expression,
          [trueNode]
        );

        return {
          childNodes: childNodes,
          breakNodes: breakNodes,
        };
      } else {
        const node: Node = this.createNode(cfg, [AST.loc.start.line], []);
        this.connectParents(cfg, parents, [node]);

        const { childNodes, breakNodes } = this.visitChild(
          cfg,
          AST.expression,
          [node]
        );

        return {
          childNodes: childNodes,
          breakNodes: breakNodes,
        };
      }
    } else {
      const node: Node = this.createNode(cfg, [AST.loc.start.line], []);
      this.connectParents(cfg, parents, [node]);

      const { childNodes, breakNodes } = this.visitChild(cfg, AST.expression, [
        node,
      ]);

      return {
        childNodes: childNodes,
        breakNodes: breakNodes,
      };
    }
  }

  /**
   * This is a terminating node
   * @param cfg
   * @param AST
   * @param parents
   * @constructor
   * @private
   */
  private ReturnStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    const node: Node = this.createNode(cfg, [AST.loc.start.line], []);
    this.connectParents(cfg, parents, [node]);

    // this.visitChild(cfg, AST.expression, [node]);

    return {
      childNodes: [],
      breakNodes: [],
    };
  }

  /**
   * This is a break statement
   * @param cfg
   * @param AST
   * @param parents
   * @constructor
   * @private
   */
  private BreakStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
    const node: Node = this.createNode(cfg, [AST.loc.start.line], []);
    this.connectParents(cfg, parents, [node]);

    return {
      childNodes: [],
      breakNodes: [node],
    };
  }
}
