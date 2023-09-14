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
  ArrayTypeName,
  AssemblyAssignment,
  AssemblyBlock,
  AssemblyCall,
  AssemblyCase,
  AssemblyExpression,
  AssemblyFor,
  AssemblyFunctionDefinition,
  AssemblyFunctionReturns,
  AssemblyIf,
  AssemblyItem,
  AssemblyLiteral,
  AssemblyLocalDefinition,
  AssemblyStackAssignment,
  AssemblySwitch,
  BinaryOperation,
  Block,
  BooleanLiteral,
  Break,
  BreakStatement,
  Conditional,
  Continue,
  ContinueStatement,
  ContractDefinition,
  DecimalNumber,
  DoWhileStatement,
  ElementaryTypeName,
  EmitStatement,
  EnumDefinition,
  EnumValue,
  EventDefinition,
  Expression,
  ExpressionStatement,
  ForStatement,
  FunctionDefinition,
  FunctionTypeName,
  HexNumber,
  Identifier,
  IfStatement,
  ImportDirective,
  IndexAccess,
  InheritanceSpecifier,
  InlineAssemblyStatement,
  LabelDefinition,
  Mapping,
  MemberAccess,
  ModifierDefinition,
  ModifierInvocation,
  NumberLiteral,
  PragmaDirective,
  PrimaryExpression,
  ReturnStatement,
  SimpleStatement,
  SourceUnit,
  StateVariableDeclaration,
  Statement,
  StringLiteral,
  StructDefinition,
  SubAssembly,
  ThrowStatement,
  TupleExpression,
  TypeName,
  UserDefinedTypeName,
  UsingForDeclaration,
  VariableDeclaration,
  VariableDeclarationStatement,
  WhileStatement,
} from "@solidity-parser/parser/dist/src/ast-types";
import { Logger, getLogger } from "@syntest/logging";
import { Literal, Loop, NodePath } from "./NodePath";

export abstract class AbstractSyntaxTreeVisitor {
  protected static LOGGER: Logger;

  protected _filePath: string;

  protected _syntaxForgiving: boolean;

  get filePath() {
    return this._filePath;
  }

  get syntaxForgiving() {
    return this._syntaxForgiving;
  }

  constructor(filePath: string, syntaxForgiving: boolean) {
    AbstractSyntaxTreeVisitor.LOGGER = getLogger("AbstractSyntaxTreeVisitor");
    this._filePath = filePath;
    this._syntaxForgiving = syntaxForgiving;
  }

  public _getNodeId(path: NodePath<ASTNode>) {
    const loc = path.node.loc;
    const range = path.node.range;

    if (loc === undefined) {
      throw new Error(
        `Node ${path.node.type} in file '${this._filePath}' does not have a location`
      );
    }

    const startLine = loc.start.line;
    const startColumn = loc.start.column;
    const startIndex = range[0];
    const endLine = loc.end.line;
    const endColumn = loc.end.column;
    const endIndex = range[1];

    return `${this._filePath}:${startLine}:${startColumn}:::${endLine}:${endColumn}:::${startIndex}:${endIndex}`;
  }

  ASTNode = (path: NodePath<ASTNode>) => {
    AbstractSyntaxTreeVisitor.LOGGER.silly(
      `Visiting node ${path.type} in file '${this._filePath}': location: ${path.node.loc?.start.line}:${path.node.loc?.start.column} - ${path.node.loc?.end.line}:${path.node.loc?.end.column} - type: ${path.node.type}`
    );
  };

  "ASTNode:exit" = (path: NodePath<ASTNode>) => {
    AbstractSyntaxTreeVisitor.LOGGER.silly(
      `Exiting node ${path.type} in file '${this._filePath}': location: ${path.node.loc?.start.line}:${path.node.loc?.start.column} - ${path.node.loc?.end.line}:${path.node.loc?.end.column} - type: ${path.node.type}`
    );
  };
}

declare type ASTMap<U> = {
  [K in ASTNodeTypeString]: U extends {
    type: K;
  }
    ? U
    : never;
};
declare type ASTTypeMap = ASTMap<ASTNode>;
declare type ASTVisitorEnter = {
  [K in keyof ASTTypeMap]?: (path: NodePath<ASTTypeMap[K]>) => boolean | void;
};
declare type ASTVisitorExit = {
  [K in keyof ASTTypeMap as `${K}:exit`]?: (
    path: NodePath<ASTTypeMap[K]>
  ) => boolean | void;
};

export interface AbstractSyntaxTreeVisitor
  extends ASTVisitorEnter,
    ASTVisitorExit {
  // groups
  // ASTNode?: (path: NodePath<ASTNode>) => boolean | void;
  // 'ASTNode:exit'?: (path: NodePath<ASTNode>) => boolean | void;
  AssemblyItem?: (path: NodePath<AssemblyItem>) => boolean | void;
  "AssemblyItem:exit"?: (path: NodePath<AssemblyItem>) => boolean | void;
  AssemblyExpression?: (path: NodePath<AssemblyExpression>) => boolean | void;
  "AssemblyExpression:exit"?: (
    path: NodePath<AssemblyExpression>
  ) => boolean | void;
  Expression?: (path: NodePath<Expression>) => boolean | void;
  "Expression:exit"?: (path: NodePath<Expression>) => boolean | void;
  PrimaryExpression?: (path: NodePath<PrimaryExpression>) => boolean | void;
  "PrimaryExpression:exit"?: (
    path: NodePath<PrimaryExpression>
  ) => boolean | void;
  SimpleStatement?: (path: NodePath<SimpleStatement>) => boolean | void;
  "SimpleStatement:exit"?: (path: NodePath<SimpleStatement>) => boolean | void;
  TypeName?: (path: NodePath<TypeName>) => boolean | void;
  "TypeName:exit"?: (path: NodePath<TypeName>) => boolean | void;
  Statement?: (path: NodePath<Statement>) => boolean | void;
  "Statement:exit"?: (path: NodePath<Statement>) => boolean | void;

  // custom groups
  Literal?: (path: NodePath<Literal>) => boolean | void;
  "Literal:exit"?: (path: NodePath<Literal>) => boolean | void;
  Loop?: (path: NodePath<Loop>) => boolean | void;
  "Loop:exit"?: (path: NodePath<Loop>) => boolean | void;

  // specific
  SourceUnit?: (path: NodePath<SourceUnit>) => void | boolean;
  PragmaDirective?: (path: NodePath<PragmaDirective>) => void | boolean;
  ImportDirective?: (path: NodePath<ImportDirective>) => void | boolean;
  ContractDefinition?: (path: NodePath<ContractDefinition>) => void | boolean;
  InheritanceSpecifier?: (
    path: NodePath<InheritanceSpecifier>
  ) => void | boolean;
  StateVariableDeclaration?: (
    path: NodePath<StateVariableDeclaration>
  ) => void | boolean;
  UsingForDeclaration?: (path: NodePath<UsingForDeclaration>) => void | boolean;
  StructDefinition?: (path: NodePath<StructDefinition>) => void | boolean;
  ModifierDefinition?: (path: NodePath<ModifierDefinition>) => void | boolean;
  ModifierInvocation?: (path: NodePath<ModifierInvocation>) => void | boolean;
  FunctionDefinition?: (path: NodePath<FunctionDefinition>) => void | boolean;
  EventDefinition?: (path: NodePath<EventDefinition>) => void | boolean;
  EnumValue?: (path: NodePath<EnumValue>) => void | boolean;
  EnumDefinition?: (path: NodePath<EnumDefinition>) => void | boolean;
  VariableDeclaration?: (path: NodePath<VariableDeclaration>) => void | boolean;
  UserDefinedTypeName?: (path: NodePath<UserDefinedTypeName>) => void | boolean;
  Mapping?: (path: NodePath<Mapping>) => void | boolean;
  ArrayTypeName?: (path: NodePath<ArrayTypeName>) => void | boolean;
  FunctionTypeName?: (path: NodePath<FunctionTypeName>) => void | boolean;
  Block?: (path: NodePath<Block>) => void | boolean;
  ExpressionStatement?: (path: NodePath<ExpressionStatement>) => void | boolean;
  IfStatement?: (path: NodePath<IfStatement>) => void | boolean;
  WhileStatement?: (path: NodePath<WhileStatement>) => void | boolean;
  ForStatement?: (path: NodePath<ForStatement>) => void | boolean;
  InlineAssemblyStatement?: (
    path: NodePath<InlineAssemblyStatement>
  ) => void | boolean;
  DoWhileStatement?: (path: NodePath<DoWhileStatement>) => void | boolean;
  ContinueStatement?: (path: NodePath<ContinueStatement>) => void | boolean;
  BreakStatement?: (path: NodePath<BreakStatement>) => void | boolean;
  ReturnStatement?: (path: NodePath<ReturnStatement>) => void | boolean;
  EmitStatement?: (path: NodePath<EmitStatement>) => void | boolean;
  ThrowStatement?: (path: NodePath<ThrowStatement>) => void | boolean;
  VariableDeclarationStatement?: (
    path: NodePath<VariableDeclarationStatement>
  ) => void | boolean;
  ElementaryTypeName?: (path: NodePath<ElementaryTypeName>) => void | boolean;
  AssemblyBlock?: (path: NodePath<AssemblyBlock>) => void | boolean;
  AssemblyCall?: (path: NodePath<AssemblyCall>) => void | boolean;
  AssemblyLocalDefinition?: (
    path: NodePath<AssemblyLocalDefinition>
  ) => void | boolean;
  AssemblyAssignment?: (path: NodePath<AssemblyAssignment>) => void | boolean;
  AssemblyStackAssignment?: (
    path: NodePath<AssemblyStackAssignment>
  ) => void | boolean;
  LabelDefinition?: (path: NodePath<LabelDefinition>) => void | boolean;
  AssemblySwitch?: (path: NodePath<AssemblySwitch>) => void | boolean;
  AssemblyCase?: (path: NodePath<AssemblyCase>) => void | boolean;
  AssemblyFunctionDefinition?: (
    path: NodePath<AssemblyFunctionDefinition>
  ) => void | boolean;
  AssemblyFunctionReturns?: (
    path: NodePath<AssemblyFunctionReturns>
  ) => void | boolean;
  AssemblyFor?: (path: NodePath<AssemblyFor>) => void | boolean;
  AssemblyIf?: (path: NodePath<AssemblyIf>) => void | boolean;
  AssemblyLiteral?: (path: NodePath<AssemblyLiteral>) => void | boolean;
  SubAssembly?: (path: NodePath<SubAssembly>) => void | boolean;
  TupleExpression?: (path: NodePath<TupleExpression>) => void | boolean;
  StringLiteral?: (path: NodePath<StringLiteral>) => void | boolean;
  NumberLiteral?: (path: NodePath<NumberLiteral>) => void | boolean;
  BooleanLiteral?: (path: NodePath<BooleanLiteral>) => void | boolean;
  Identifier?: (path: NodePath<Identifier>) => void | boolean;
  BinaryOperation?: (path: NodePath<BinaryOperation>) => void | boolean;
  Conditional?: (path: NodePath<Conditional>) => void | boolean;
  IndexAccess?: (path: NodePath<IndexAccess>) => void | boolean;
  MemberAccess?: (path: NodePath<MemberAccess>) => void | boolean;
  Break?: (path: NodePath<Break>) => void | boolean;
  HexNumber?: (path: NodePath<HexNumber>) => void | boolean;
  DecimalNumber?: (path: NodePath<DecimalNumber>) => void | boolean;
  Continue?: (path: NodePath<Continue>) => void | boolean;
  // Start of :exit handler for each type. Must be consistent with above
  "SourceUnit:exit"?: (path: NodePath<SourceUnit>) => void | boolean;
  "PragmaDirective:exit"?: (path: NodePath<PragmaDirective>) => void | boolean;
  "ImportDirective:exit"?: (path: NodePath<ImportDirective>) => void | boolean;
  "ContractDefinition:exit"?: (
    path: NodePath<ContractDefinition>
  ) => void | boolean;
  "InheritanceSpecifier:exit"?: (
    path: NodePath<InheritanceSpecifier>
  ) => void | boolean;
  "StateVariableDeclaration:exit"?: (
    path: NodePath<StateVariableDeclaration>
  ) => void | boolean;
  "UsingForDeclaration:exit"?: (
    path: NodePath<UsingForDeclaration>
  ) => void | boolean;
  "StructDefinition:exit"?: (
    path: NodePath<StructDefinition>
  ) => void | boolean;
  "ModifierDefinition:exit"?: (
    path: NodePath<ModifierDefinition>
  ) => void | boolean;
  "ModifierInvocation:exit"?: (
    path: NodePath<ModifierInvocation>
  ) => void | boolean;
  "FunctionDefinition:exit"?: (
    path: NodePath<FunctionDefinition>
  ) => void | boolean;
  "EventDefinition:exit"?: (path: NodePath<EventDefinition>) => void | boolean;
  "EnumValue:exit"?: (path: NodePath<EnumValue>) => void | boolean;
  "EnumDefinition:exit"?: (path: NodePath<EnumDefinition>) => void | boolean;
  "VariableDeclaration:exit"?: (
    path: NodePath<VariableDeclaration>
  ) => void | boolean;
  "UserDefinedTypeName:exit"?: (
    path: NodePath<UserDefinedTypeName>
  ) => void | boolean;
  "Mapping:exit"?: (path: NodePath<Mapping>) => void | boolean;
  "ArrayTypeName:exit"?: (path: NodePath<ArrayTypeName>) => void | boolean;
  "FunctionTypeName:exit"?: (
    path: NodePath<FunctionTypeName>
  ) => void | boolean;
  "Block:exit"?: (path: NodePath<Block>) => void | boolean;
  "ExpressionStatement:exit"?: (
    path: NodePath<ExpressionStatement>
  ) => void | boolean;
  "IfStatement:exit"?: (path: NodePath<IfStatement>) => void | boolean;
  "WhileStatement:exit"?: (path: NodePath<WhileStatement>) => void | boolean;
  "ForStatement:exit"?: (path: NodePath<ForStatement>) => void | boolean;
  "InlineAssemblyStatement:exit"?: (
    path: NodePath<InlineAssemblyStatement>
  ) => void | boolean;
  "DoWhileStatement:exit"?: (
    path: NodePath<DoWhileStatement>
  ) => void | boolean;
  "ContinueStatement:exit"?: (
    path: NodePath<ContinueStatement>
  ) => void | boolean;
  "BreakStatement:exit"?: (path: NodePath<BreakStatement>) => void | boolean;
  "ReturnStatement:exit"?: (path: NodePath<ReturnStatement>) => void | boolean;
  "EmitStatement:exit"?: (path: NodePath<EmitStatement>) => void | boolean;
  "ThrowStatement:exit"?: (path: NodePath<ThrowStatement>) => void | boolean;
  "VariableDeclarationStatement:exit"?: (
    path: NodePath<VariableDeclarationStatement>
  ) => void | boolean;
  "ElementaryTypeName:exit"?: (
    path: NodePath<ElementaryTypeName>
  ) => void | boolean;
  "AssemblyBlock:exit"?: (path: NodePath<AssemblyBlock>) => void | boolean;
  "AssemblyCall:exit"?: (path: NodePath<AssemblyCall>) => void | boolean;
  "AssemblyLocalDefinition:exit"?: (
    path: NodePath<AssemblyLocalDefinition>
  ) => void | boolean;
  "AssemblyAssignment:exit"?: (
    path: NodePath<AssemblyAssignment>
  ) => void | boolean;
  "AssemblyStackAssignment:exit"?: (
    path: NodePath<AssemblyStackAssignment>
  ) => void | boolean;
  "LabelDefinition:exit"?: (path: NodePath<LabelDefinition>) => void | boolean;
  "AssemblySwitch:exit"?: (path: NodePath<AssemblySwitch>) => void | boolean;
  "AssemblyCase:exit"?: (path: NodePath<AssemblyCase>) => void | boolean;
  "AssemblyFunctionDefinition:exit"?: (
    path: NodePath<AssemblyFunctionDefinition>
  ) => void | boolean;
  "AssemblyFunctionReturns:exit"?: (
    path: NodePath<AssemblyFunctionReturns>
  ) => void | boolean;
  "AssemblyFor:exit"?: (path: NodePath<AssemblyFor>) => void | boolean;
  "AssemblyIf:exit"?: (path: NodePath<AssemblyIf>) => void | boolean;
  "AssemblyLiteral:exit"?: (path: NodePath<AssemblyLiteral>) => void | boolean;
  "SubAssembly:exit"?: (path: NodePath<SubAssembly>) => void | boolean;
  "TupleExpression:exit"?: (path: NodePath<TupleExpression>) => void | boolean;
  "NumberLiteral:exit"?: (path: NodePath<NumberLiteral>) => void | boolean;
  "BooleanLiteral:exit"?: (path: NodePath<BooleanLiteral>) => void | boolean;
  "Identifier:exit"?: (path: NodePath<Identifier>) => void | boolean;
  "BinaryOperation:exit"?: (path: NodePath<BinaryOperation>) => void | boolean;
  "Conditional:exit"?: (path: NodePath<Conditional>) => void | boolean;
  "IndexAccess:exit"?: (path: NodePath<IndexAccess>) => void | boolean;
  "MemberAccess:exit"?: (path: NodePath<MemberAccess>) => void | boolean;
  "HexNumber:exit"?: (path: NodePath<HexNumber>) => void | boolean;
  "DecimalNumber:exit"?: (path: NodePath<DecimalNumber>) => void | boolean;
  "Break:exit"?: (path: NodePath<Break>) => void | boolean;
  "Continue:exit"?: (path: NodePath<Continue>) => void | boolean;
}
