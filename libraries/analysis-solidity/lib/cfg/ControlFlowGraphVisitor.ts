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
import { BaseASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import {AbstractSyntaxTreeVisitor} from '@syntest/ast-visitor-solidity'
import { ControlFlowFunction, ControlFlowGraph, Edge, EdgeType, Location, Node, NodeType } from '@syntest/cfg';
import { Logger, getLogger } from '@syntest/logging';

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

  private _getLocation(astNode: BaseASTNode): Location {
    return {
      start: {
        line: astNode.loc.start.line,
        column: astNode.loc.start.column,
        index: astNode.range[0],
      },
      end: {
        line: astNode.loc.end.line,
        column: astNode.loc.end.column,
        index: astNode.range[1]
      },
    };
  }

  private _createNode(astNode: BaseASTNode): Node {
    const id = `${this._getNodeId(astNode)}`;
    const node = new Node(
      id,
      NodeType.NORMAL,
      astNode.type,
      [
        {
          id: id,
          location: this._getLocation(astNode),
          statementAsText: ''// TODO
        },
      ],
      {},
      astNode.type
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

    // TODO
}