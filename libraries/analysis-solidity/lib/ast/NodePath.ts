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
import { ASTNode, Expression, NameValueList, Statement, astNodeTypes, AssemblyItem, DoWhileStatement, ForStatement, BooleanLiteral, HexLiteral, NumberLiteral, StringLiteral, WhileStatement } from "@solidity-parser/parser/dist/src/ast-types";
import { Hub } from "./Hub";

export class NodePath<T extends ASTNode = ASTNode> {
  hub: Hub
    node: T
    type: T['type']
    parentPath: NodePath<ASTNode> | undefined

    constructor(hub: Hub, node: T, parentPath: NodePath<ASTNode>) {
      this.hub = hub
        this.node = node
        this.type = node.type
        this.parentPath = parentPath
    }

    getSource() {
      const node = this.node;
      if (node.range) {
        const code = this.hub.getCode();
        if (code) return code.slice(node.range[0], node.range[1]);
      }
      return "";
    }

    has<K extends keyof T>(key: K): boolean {
        const node = this.node;
        const container = node[key];

        return isASTNode(container)
    }

    get<K extends keyof T>(
        key: K
        ): T[K] extends Array<ASTNode | null | undefined>
        ? Array<NodePath<T[K][number]>>
        : T[K] extends ASTNode | null | undefined 
        ? NodePath<T[K]> 
        : never;
        
    get<K extends keyof T>(
        key: K
        ): NodePath | NodePath[] {
        const node = this.node;
        const container = node[key];

        if (!isASTNode(container)) {
            return undefined
        }

        // eslint-disable-next-line unicorn/prefer-ternary
        if (Array.isArray(container)) {
            // requested a container so give them all the paths
            return container.map((c) => {
                return new NodePath(this.hub, c, this)
            });
        } else {
            return new NodePath(this.hub, container, this)
        }
    } 


    // groups
    isAssemblyItem<T extends ASTNode>(): this is NodePath<T & AssemblyItem> {
        return (AssemblyItemTypes).has(this.node.type)
    }

    isAssemblyExpression<T extends ASTNode>(): this is NodePath<T & Expression> {
        return (AssemblyExpressionTypes).has(this.node.type)
    }

    isExpression<T extends ASTNode>(): this is NodePath<T & Expression> {
        return (ExpressionTypes).has(this.node.type)
    }

    isPrimaryExpression<T extends ASTNode>(): this is NodePath<T & Expression> {
        return (PrimaryExpressionTypes).has(this.node.type)
    }

    isSimpleStatement<T extends ASTNode>(): this is NodePath<T & Expression> {
        return (SimpleStatementTypes).has(this.node.type)
    }

    isTypeName<T extends ASTNode>(): this is NodePath<T & Expression> {
        return (TypeNameTypes).has(this.node.type)
    }

    isStatement<T extends ASTNode>(): this is NodePath<T & Statement> {
        return (StatementTypes).has(this.node.type)
    }

    isLiteral<T extends ASTNode>(): this is NodePath<T & Literal> {
        return (LiteralTypes).has(this.node.type)
    }

    isLoop<T extends ASTNode>(): this is NodePath<T & Loop> {
        return (loopTypes).has(this.node.type)
    }

    // specific
    isNameValueList<T extends ASTNode>(): this is NodePath<T & NameValueList> {
        return this.node.type === 'NameValueList'
    }
}

function isASTNode(node: unknown): node is ASTNode {
    if (typeof node !== 'object' || node === null) {
      return false
    }
  
    const nodeAsASTNode = node as ASTNode
  
    if (
      Object.prototype.hasOwnProperty.call(nodeAsASTNode, 'type') &&
      typeof nodeAsASTNode.type === 'string'
    ) {
      return astNodeTypes.includes(nodeAsASTNode.type)
    }
  
    return false
  }

  const AssemblyItemTypes = new Set([
    "Identifier",
    "AssemblyBlock",
    "AssemblyExpression", "AssemblyLocalDefinition", "AssemblyAssignment", "AssemblyStackAssignment", "LabelDefinition", "AssemblySwitch", "AssemblyFunctionDefinition", "AssemblyFor", "AssemblyIf", "Break", "Continue", "SubAssembly", "NumberLiteral", "StringLiteral", "HexNumber", "HexLiteral", "DecimalNumber"
  ])
  const AssemblyExpressionTypes = new Set([
    "AssemblyCall",
    "AssemblyLiteral"
  ])

  const ExpressionTypes = new Set([
    "IndexAccess", "IndexRangeAccess", "TupleExpression", "BinaryOperation", "Conditional", "MemberAccess", "FunctionCall", "UnaryOperation", "NewExpression", "PrimaryExpression", "NameValueExpression"
  ])

  const LiteralTypes = new Set([
    "BooleanLiteral", "HexLiteral", "StringLiteral", "NumberLiteral"
  ])

  const SimpleStatementTypes = new Set([
    "VariableDeclarationStatement", "ExpressionStatement"
  ])

  const TypeNameTypes = new Set([
    "ElementaryTypeName", "UserDefinedTypeName", "Mapping", "ArrayTypeName", "FunctionTypeName"
  ])

  const PrimaryExpressionTypes = new Set([
    ...LiteralTypes, "Identifier", "TupleExpression", ...TypeNameTypes
  ])

  const StatementTypes = new Set([
    "IfStatement", "WhileStatement", "ForStatement", "Block", "InlineAssemblyStatement", "DoWhileStatement", "ContinueStatement", "BreakStatement", "ReturnStatement", "EmitStatement", "ThrowStatement", "VariableDeclarationStatement", "UncheckedStatement", "TryStatement", "RevertStatement", ...SimpleStatementTypes
  ])

  const loopTypes = new Set([
    "WhileStatement", "ForStatement", "DoWhileStatement"
  ])

  export declare type Literal = BooleanLiteral | HexLiteral | StringLiteral | NumberLiteral
  export declare type Loop = WhileStatement | ForStatement | DoWhileStatement