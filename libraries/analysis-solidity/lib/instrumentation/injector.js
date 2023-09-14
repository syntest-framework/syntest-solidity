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
import web3Utils from "web3-utils";
import Injector from "solidity-coverage/lib/injector";
import crypto from "node:crypto";

class SyntestInjector extends Injector {
  constructor() {
    super();
  }

  _getMethodIdentifier(id) {
    return `coverage_${web3Utils.keccak256(id).slice(0, 10)}`;
  }

  injectLine(contract, fileName, injectionPoint, injection, instrumentation) {
    const type = "line";
    const { start, end } = this._split(contract, injectionPoint);
    const id = `${fileName}:${injection.contractName}`;

    const newLines = start.match(/\n/g);
    const linecount = (newLines || []).length + 1;
    contract.runnableLines.push(linecount);

    const hash = this._getHash(id);
    const injectable = this._getInjectable(id, hash, type);

    instrumentation[hash] = {
      id: linecount,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
  }

  injectStatement(
    contract,
    fileName,
    injectionPoint,
    injection,
    instrumentation
  ) {
    const type = "statement";
    const id = `${fileName}:${injection.contractName}`;

    const { start, end, hash, injectable } = this._getInjectionComponents(
      contract,
      injectionPoint,
      id,
      type
    );

    instrumentation[hash] = {
      id: injection.statementId,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
  }

  injectFunction(
    contract,
    fileName,
    injectionPoint,
    injection,
    instrumentation
  ) {
    const type = "function";
    const id = `${fileName}:${injection.contractName}`;

    const { start, end, hash, injectable } = this._getInjectionComponents(
      contract,
      injectionPoint,
      id,
      type
    );

    instrumentation[hash] = {
      id: injection.fnId,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
  }

  injectBranch(contract, fileName, injectionPoint, injection, instrumentation) {
    const type = "branch";
    const id = `${fileName}:${injection.contractName}`;

    const { start, end, hash, injectable } = this._getInjectionComponents(
      contract,
      injectionPoint,
      id,
      type
    );

    instrumentation[hash] = {
      id: injection.branchId,
      locationIdx: injection.locationIdx,
      branchType: injection.branchType,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
  }

  injectEmptyBranch(
    contract,
    fileName,
    injectionPoint,
    injection,
    instrumentation
  ) {
    const type = "branch";
    const id = `${fileName}:${injection.contractName}`;

    const { start, end, hash, injectable } = this._getInjectionComponents(
      contract,
      injectionPoint,
      id,
      type
    );

    instrumentation[hash] = {
      id: injection.branchId,
      locationIdx: injection.locationIdx,
      branchType: injection.branchType,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}else { ${injectable}}${end}`;
  }

  injectRequirePre(
    contract,
    fileName,
    injectionPoint,
    injection,
    instrumentation
  ) {
    const type = "requirePre";
    const id = `${fileName}:${injection.contractName}`;

    const { start, end, hash, injectable } = this._getInjectionComponents(
      contract,
      injectionPoint,
      id,
      type
    );

    instrumentation[hash] = {
      id: injection.branchId,
      locationIdx: injection.locationIdx,
      branchType: injection.branchType,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };
    const variableName = crypto
      .createHash("md5")
      .update(injection.condition)
      .digest("hex");
    contract.instrumented = `${start}if(${injection.condition}){}${injectable}${end}`;
  }

  injectRequirePost(
    contract,
    fileName,
    injectionPoint,
    injection,
    instrumentation
  ) {
    const type = "requirePost";
    const id = `${fileName}:${injection.contractName}`;

    const { start, end, hash, injectable } = this._getInjectionComponents(
      contract,
      injectionPoint,
      id,
      type
    );

    instrumentation[hash] = {
      id: injection.branchId,
      locationIdx: injection.locationIdx,
      branchType: injection.branchType,
      type: type,
      path: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
  }
}

export default SyntestInjector;
