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

import {
  ASTNode,
  ASTNodeTypeString,
  astNodeTypes,
} from "@solidity-parser/parser/dist/src/ast-types";
import { AbstractSyntaxTreeVisitor } from "./AbstractSyntaxTreeVisitor";
import { NodePath } from "./NodePath";

function _isASTNode(node: unknown): node is ASTNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }

  const nodeAsASTNode = node as ASTNode;

  if (
    Object.prototype.hasOwnProperty.call(nodeAsASTNode, "type") &&
    typeof nodeAsASTNode.type === "string"
  ) {
    return astNodeTypes.includes(nodeAsASTNode.type);
  }

  return false;
}

export function visit(
  path: NodePath<ASTNode> | NodePath<ASTNode>[],
  visitor: AbstractSyntaxTreeVisitor
): void {
  if (Array.isArray(path)) {
    for (const child of path) visit(child, visitor);
    return;
  }

  if (!_isASTNode(path.node)) return;

  let cont: void | boolean = true;
  if (path.type in visitor && visitor[path.type] !== undefined) {
    if (path.isStatement()) {
      cont = visitor.Statement(path);
    }

    if (cont === false) return;

    if (path.isExpression()) {
      cont = visitor.Expression(path);
    }

    if (cont === false) return;

    // TODO can we avoid this `as never`
    cont = visitor[path.type](path as never);
  }

  if (cont === false) return;

  for (const property in path.node) {
    if (Object.prototype.hasOwnProperty.call(path.node, property)) {
      const child = path.get(<never>property);
      // TODO can we avoid this `as any`
      visit(child, visitor);
    }
  }

  if (path.isStatement()) {
    visitor["Statement:exit"](path);
  }
  if (path.isExpression()) {
    visitor["Expression:exit"](path);
  }

  const selector = (path.node.type + ":exit") as `${ASTNodeTypeString}:exit`;
  if (visitor[selector] !== undefined) {
    // TODO can we avoid this `as never`
    visitor[selector](path as never);
  }
}
