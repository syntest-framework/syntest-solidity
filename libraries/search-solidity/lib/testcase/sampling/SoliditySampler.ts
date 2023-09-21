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

import { EncodingSampler } from "@syntest/search";
import { Parameter } from "@syntest/analysis-solidity";

import { SolidityTestCase } from "../SolidityTestCase";
import { ConstructorCall } from "../statements/action/ConstructorCall";
import { ContractFunctionCall } from "../statements/action/ContractFunctionCall";
import { Statement } from "../statements/Statement";
import { SoliditySubject } from "../../search/SoliditySubject";
import { ConstantPool, RootContext } from "@syntest/analysis-solidity";
import { NumericStatement } from "../statements/primitive/NumericStatement";
import { AddressStatement } from "../statements/primitive/AddressStatement";
import { BoolStatement } from "../statements/primitive/BoolStatement";
import { IntegerStatement } from "../statements/primitive/IntegerStatement";
import { StringStatement } from "../statements/primitive/StringStatement";
import { FixedSizeByteArrayStatement } from "../statements/primitive/FixedSizeByteArrayStatement";
import { DynamicSizeByteArrayStatement } from "../statements/primitive/DynamicSizeByteArrayStatement";
import { ActionStatement } from "../statements/action/ActionStatement";
import { StatementPool } from "../StatementPool";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export abstract class SoliditySampler extends EncodingSampler<SolidityTestCase> {
  private _rootContext: RootContext;

  private _constantPool: ConstantPool;
  private _constantPoolEnabled: boolean;
  private _constantPoolProbability: number;

  private _statementPoolEnabled: boolean;
  private _statementPoolProbability: number;

  private _maxActionStatements: number;
  private _stringAlphabet: string;
  private _stringMaxLength: number;

  private _deltaMutationProbability: number;

  private _exploreIllegalValues: boolean;

  private _statementPool: StatementPool | null;

  private _maxDepth = 10;

  private _numericDecimals: number;

  constructor(
    subject: SoliditySubject,
    constantPool: ConstantPool,
    constantPoolEnabled: boolean,
    constantPoolProbability: number,
    statementPoolEnabled: boolean,
    statementPoolProbability: number,
    maxActionStatements: number,
    stringAlphabet: string,
    stringMaxLength: number,
    deltaMutationProbability: number,
    exploreIllegalValues: boolean,
    numericDecimals: number
  ) {
    super(subject);
    this._constantPool = constantPool;
    this._constantPoolEnabled = constantPoolEnabled;
    this._constantPoolProbability = constantPoolProbability;

    this._statementPoolEnabled = statementPoolEnabled;
    this._statementPoolProbability = statementPoolProbability;

    this._maxActionStatements = maxActionStatements;
    this._stringAlphabet = stringAlphabet;
    this._stringMaxLength = stringMaxLength;
    this._deltaMutationProbability = deltaMutationProbability;
    this._exploreIllegalValues = exploreIllegalValues;
    this._numericDecimals = numericDecimals;
  }

  get rootContext() {
    return this._rootContext;
  }

  set rootContext(rootContext: RootContext) {
    this._rootContext = rootContext;
  }

  get statementPool() {
    return this._statementPool;
  }

  set statementPool(statementPool: StatementPool) {
    this._statementPool = statementPool;
  }

  abstract sampleRoot(): ActionStatement;

  abstract sampleConstructorCall(
    depth: number,
    type: Parameter
  ): ConstructorCall;
  abstract sampleContractFunctionCall(
    depth: number,
    type: Parameter
  ): ContractFunctionCall;

  abstract sampleArgument(depth: number, type: Parameter): Statement;

  abstract sampleAddressStatement(
    depth: number,
    type: Parameter
  ): AddressStatement;
  abstract sampleBoolStatement(depth: number, type: Parameter): BoolStatement;
  abstract sampleIntegerStatement(
    depth: number,
    type: Parameter
  ): IntegerStatement;
  abstract sampleNumericStatement(
    depth: number,
    type: Parameter
  ): NumericStatement;
  abstract sampleFixedSizeByteArrayStatement(
    depth: number,
    type: Parameter
  ): FixedSizeByteArrayStatement;
  abstract sampleDynamicSizeByteArrayStatement(
    depth: number,
    type: Parameter
  ): DynamicSizeByteArrayStatement;
  abstract sampleStringStatement(
    depth: number,
    type: Parameter
  ): StringStatement;
  // abstract sampleHexStatement(depth: number, type: Parameter): StringStatement
  // abstract sampleMappingStatement(depth: number, type: Parameter): StringStatement
  // abstract sampleArrayStatement(depth: number, type: Parameter): StringStatement

  get constantPool(): ConstantPool {
    return this._constantPool;
  }

  get constantPoolEnabled(): boolean {
    return this._constantPoolEnabled;
  }

  get constantPoolProbability(): number {
    return this._constantPoolProbability;
  }

  get statementPoolEnabled(): boolean {
    return this._statementPoolEnabled;
  }

  get statementPoolProbability(): number {
    return this._statementPoolProbability;
  }

  get maxActionStatements(): number {
    return this._maxActionStatements;
  }

  get stringAlphabet(): string {
    return this._stringAlphabet;
  }

  get stringMaxLength(): number {
    return this._stringMaxLength;
  }

  get deltaMutationProbability(): number {
    return this._deltaMutationProbability;
  }

  get exploreIllegalValues(): boolean {
    return this._exploreIllegalValues;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }

  get numericDecimals(): number {
    return this._numericDecimals;
  }
}
