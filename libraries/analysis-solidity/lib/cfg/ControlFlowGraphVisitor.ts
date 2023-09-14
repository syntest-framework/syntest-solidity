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
import { Statement } from '@solidity-parser/parser/dist/src/ast-types';
import { ControlFlowFunction, ControlFlowGraph, Edge, EdgeType, Location, Node, NodeType } from '@syntest/cfg';
import { Logger, getLogger } from '@syntest/logging';
import { AbstractSyntaxTreeVisitor } from '../ast/AbstractSyntaxTreeVisitor';
import { NodePath } from '../ast/NodePath';

export class ControlFlowGraphVisitor extends AbstractSyntaxTreeVisitor {
    protected static override LOGGER: Logger;

    private _nodesList: Node[];
    private _nodes: Map<string, Node>;
    private _edges: Edge[];
  
    private _labeledBreakNodes: Map<string, Set<string>>;
    private _labeledContinueNodes: Map<string, Set<string>>;
  
    private _regularBreakNodesStack: Set<string>[];
    private _regularContinueNodesStack: Set<string>[];
    private _returnNodes: Set<string>;
    private _throwNodes: Set<string>;
  
    private _functions: ControlFlowFunction[];
  
    private _currentParents: string[];
    private _edgeType: EdgeType;

    get cfg() {
      if (!this._nodes.has("ENTRY")) {
        throw new Error("No entry node found");
      }
      if (!this._nodes.has("SUCCESS_EXIT")) {
        throw new Error("No success exit node found");
      }
      if (!this._nodes.has("ERROR_EXIT")) {
        throw new Error("No error exit node found");
      }
  
      if (this._nodesList.length !== this._nodes.size) {
        throw new Error("Number of nodes dont match");
      }
  
      const entryNode = this._nodes.get("ENTRY");
      const successExitNode = this._nodes.get("SUCCESS_EXIT");
      const errorExitNode = this._nodes.get("ERROR_EXIT");
  
      if (this._currentParents[0] === "ENTRY") {
        // nothing added so we add
      }
  
      // connect last nodes to success exit
      this._connectToParents(successExitNode);
  
      // connect all return nodes to success exit
      for (const returnNode of this._returnNodes) {
        this._edges.push(
          this._createEdge(
            this._nodes.get(returnNode),
            successExitNode,
            EdgeType.NORMAL
          )
        );
      }
  
      // connect all throw nodes to error exit
      for (const throwNode of this._throwNodes) {
        this._edges.push(
          this._createEdge(
            this._nodes.get(throwNode),
            errorExitNode,
            EdgeType.EXCEPTION
          )
        );
      }
  
      if (this._regularBreakNodesStack.length > 0) {
        ControlFlowGraphVisitor.LOGGER.warn(
          `Found ${this._regularBreakNodesStack.length} break node stacks that are not connected to a loop`
        );
      }
  
      if (this._regularContinueNodesStack.length > 0) {
        ControlFlowGraphVisitor.LOGGER.warn(
          `Found ${this._regularContinueNodesStack.length} continue node stacks that are not connected to a loop`
        );
      }
  
      if (this._labeledBreakNodes.size > 0) {
        ControlFlowGraphVisitor.LOGGER.warn(
          `Found ${this._labeledBreakNodes.size} break node labels that are not connected to a label exit`
        );
      }
  
      if (this._labeledContinueNodes.size > 0) {
        ControlFlowGraphVisitor.LOGGER.warn(
          `Found ${this._labeledContinueNodes.size} continue node labels that are not connected to a label exit`
        );
      }
  
      return {
        graph: new ControlFlowGraph(
          entryNode,
          successExitNode,
          errorExitNode,
          this._nodes,
          this._edges
        ),
        functions: this._functions.map((function_, index) => {
          if (
            this._functions.filter((f) => f.name === function_.name).length > 1
          ) {
            function_.name = `${function_.name} (${index})`;
          }
          return function_;
        }),
      };
    }


  constructor(filePath: string, syntaxForgiving: boolean) {
    super(filePath, syntaxForgiving);
    ControlFlowGraphVisitor.LOGGER = getLogger("ControlFlowGraphVisitor");

    this._nodesList = [];
    this._nodes = new Map<string, Node>();
    this._edges = [];

    this._labeledBreakNodes = new Map();
    this._labeledContinueNodes = new Map();
    this._regularBreakNodesStack = [];
    this._regularContinueNodesStack = [];
    this._returnNodes = new Set<string>();
    this._throwNodes = new Set<string>();

    this._functions = [];

    this._currentParents = [];

    this._edgeType = EdgeType.NORMAL;

    const entry = new Node("ENTRY", NodeType.ENTRY, "ENTRY", [], {});
    const successExit = new Node("SUCCESS_EXIT", NodeType.EXIT, "EXIT", [], {});
    const errorExit = new Node("ERROR_EXIT", NodeType.EXIT, "EXIT", [], {});

    this._nodes.set(entry.id, entry);
    this._nodes.set(successExit.id, successExit);
    this._nodes.set(errorExit.id, errorExit);
    this._nodesList.push(entry, successExit, errorExit);

    this._currentParents = [entry.id];
  }

  private _getLocation(path: NodePath): Location {
    return {
      start: {
        line: path.node.loc.start.line,
        column: path.node.loc.start.column,
        index: path.node.range[0],
      },
      end: {
        line: path.node.loc.end.line,
        column: path.node.loc.end.column,
        index: path.node.range[1]
      },
    };
  }

  /**
   * Connects the current parents to the given node
   * It uses the current edge type and resets it back to normal afterwards
   *
   * @param node
   */
  private _connectToParents(node: Node) {
    // it is actually possible that there are no parents
    for (const parent of this._currentParents) {
      this._edges.push(
        this._createEdge(this._nodes.get(parent), node, this._edgeType)
      );
      this._edgeType = EdgeType.NORMAL;
    }
  }

  private _createNode(path: NodePath): Node {
    const id = `${this._getNodeId(path)}`;
    const node = new Node(
      id,
      NodeType.NORMAL,
      path.type,
      [
        {
          id: id,
          location: this._getLocation(path),
          statementAsText: ''// TODO
        },
      ],
      {},
      path.type
    );

    if (this._nodes.has(id)) {
      throw new Error(`Node already registered ${id}`);
    }
    this._nodes.set(id, node);
    this._nodesList.push(node);

    return node;
  }

  private _createEdge(
    source: Node,
    target: Node,
    edgeType: EdgeType,
    label = ""
  ): Edge {
    return new Edge(
      `${source.id}->${target.id}`,
      edgeType,
      label,
      source.id,
      target.id,
      "description"
    );
  }

// actual control flow graph related nodes
  override Statement = (path: NodePath<Statement>): void => {
  ControlFlowGraphVisitor.LOGGER.debug(
    `Entering statement: ${path.type}\tline: ${path.node.loc.start.line}\tcolumn: ${path.node.loc.start.column}`
  );

  if (this._nodes.has(this._getNodeId(path))) {
    throw new Error(`Id already used id: ${this._getNodeId(path)}`);
  } else {
    const node = this._createNode(path);

    this._connectToParents(node);
    this._currentParents = [node.id];
  }
};

    // TODO
}