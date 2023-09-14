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

import {
  EnumValue,
  VariableDeclaration,
  StringLiteral,
  NumberLiteral,
  Identifier,
  MemberAccess,
  HexNumber,
  DecimalNumber,
} from "@solidity-parser/parser/dist/src/ast-types";
import { ConstantPool } from "./ConstantPool";
import { AbstractSyntaxTreeVisitor } from "../ast/AbstractSyntaxTreeVisitor";
import { NodePath } from "../ast/NodePath";

/**
 * Visits the AST nodes of a contract to find all constants
 */
export class ConstantVisitor extends AbstractSyntaxTreeVisitor {
  protected _constantPool: ConstantPool;

  get constantPool() {
    return this._constantPool;
  }

  constructor(
    filePath: string,
    syntaxForgiving: boolean,
    constantPool: ConstantPool
  ) {
    super(filePath, syntaxForgiving);
    this._constantPool = constantPool;
  }

  public getConstantPool(): ConstantPool {
    return this._constantPool;
  }

  override EnumValue = (path: NodePath<EnumValue>): void => {
    this._constantPool.addString(path.node.name);
  }

  override VariableDeclaration = (path: NodePath<VariableDeclaration>): void => {
    this._constantPool.addString(path.node.name);
  }

  override StringLiteral = (path: NodePath<StringLiteral>): void => {
    if (this._isAddress(path.node.value)) {
      this._constantPool.addAddress(path.node.value);
      return;
    }

    this._constantPool.addString(path.node.value);
  }

  override NumberLiteral = (path: NodePath<NumberLiteral>): void => {
    if (this._isAddress(path.node.number)) {
      this._constantPool.addAddress(path.node.number);
      return;
    }

    this._constantPool.addInteger(Number.parseInt(path.node.number));
  }

  override Identifier = (path: NodePath<Identifier>): void => {
    if (!["require", "_"].includes(path.node.name)) this._constantPool.addString(path.node.name);
  }

  override IndexAccess = (): void => {
    // TODO: check for index numbers
  }

  override MemberAccess = (path: NodePath<MemberAccess>): void => {
    this._constantPool.addString(path.node.memberName);
  }

  override HexNumber = (path: NodePath<HexNumber>): void => {
    // TODO: check for addresses
    this._constantPool.addString(path.node.value);
  }

  override DecimalNumber = (path: NodePath<DecimalNumber>): void => {
    this._constantPool.addNumeric(Number.parseFloat(path.node.value));
  }

  protected _isAddress(value: string): boolean {
    if (value === "0x0") return true;

    return value.startsWith("0x") && value.length == 42;
  }
}
