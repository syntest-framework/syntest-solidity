const web3Utils = require("web3-utils");
const Injector = require("solidity-coverage/lib/injector");

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
      contractPath: fileName,
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
      contractPath: fileName,
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
      contractPath: fileName,
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
      type: type,
      contractPath: fileName,
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
      type: type,
      contractPath: fileName,
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
      type: type,
      contractPath: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
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
      type: type,
      contractPath: fileName,
      line: injection.line,
      hits: 0,
    };

    contract.instrumented = `${start}${injectable}${end}`;
  }
}

module.exports = SyntestInjector;
