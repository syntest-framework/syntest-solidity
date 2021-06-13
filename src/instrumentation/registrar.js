const Registrar = require("solidity-coverage/lib/registrar");

/**
 * This class overrides the Soldity-Coverage library to add line numbers for identification.
 */
class SyntestRegistrar extends Registrar {
  constructor() {
    super();
  }

  /**
   * Adds injection point to injection points map
   * @param  {Object} contract instrumentation target
   * @param  {String} key      injection point `type`
   * @param  {Number} value    injection point `id`
   */
  _createInjectionPoint(contract, key, value) {
    value.contractName = contract.contractName;

    contract.injectionPoints[key]
      ? contract.injectionPoints[key].push(value)
      : (contract.injectionPoints[key] = [value]);
  }

  /**
   * Registers injections for statement measurements
   * @param  {Object} contract   instrumentation target
   * @param  {Object} expression AST node
   */
  statement(contract, expression) {
    if (!this.trackStatements) return;

    const startContract = contract.instrumented.slice(0, expression.range[0]);
    const startline = (startContract.match(/\n/g) || []).length + 1;
    const startcol = expression.range[0] - startContract.lastIndexOf("\n") - 1;

    const expressionContent = contract.instrumented.slice(
      expression.range[0],
      expression.range[1] + 1
    );

    const endline =
      startline + (contract, expressionContent.match("/\n/g") || []).length;

    let endcol;
    if (expressionContent.lastIndexOf("\n") >= 0) {
      endcol = contract.instrumented.slice(
        expressionContent.lastIndexOf("\n"),
        expression.range[1]
      ).length;
    } else endcol = startcol + (contract, expressionContent.length - 1);

    contract.statementId += 1;
    contract.statementMap[contract.statementId] = {
      start: { line: startline, column: startcol },
      end: { line: endline, column: endcol },
    };

    this._createInjectionPoint(contract, expression.range[0], {
      type: "injectStatement",
      statementId: contract.statementId,
      line: expression.loc.start.line,
    });
  }

  /**
   * Registers injections for function measurements
   * @param  {Object} contract   instrumentation target
   * @param  {Object} expression AST node
   */
  functionDeclaration(contract, expression) {
    let start = expression.range[0];

    const instrumented = this.removeModifier(contract, expression);

    const startContract = instrumented.slice(0, start);
    const startline = (startContract.match(/\n/g) || []).length + 1;
    const startcol = start - startContract.lastIndexOf("\n") - 1;

    const endlineDelta = instrumented.slice(start).indexOf("{");
    const functionDefinition = instrumented.slice(start, start + endlineDelta);

    contract.fnId += 1;
    contract.fnMap[contract.fnId] = {
      name: expression.isConstructor ? "constructor" : expression.name,
      line: startline,
      loc: expression.loc,
      functionDefinition: functionDefinition,
    };

    this._createInjectionPoint(contract, start + endlineDelta + 1, {
      type: "injectFunction",
      fnId: contract.fnId,
      line: expression.loc.start.line,
    });
  }

  removeModifier(contract, expression) {
    let copy = contract.instrumented;

    // It's possible functions will have modifiers that take string args
    // which contains an open curly brace. Skip ahead...
    if (expression.modifiers && expression.modifiers.length) {
      for (let modifier of expression.modifiers) {
        let str = "";
        for (let index = modifier.range[0]; index <= modifier.range[1]; index++)
          str = str + " ";

        copy =
          copy.substring(0, modifier.range[0]) +
          str +
          copy.substring(modifier.range[1] + 1, copy.length);
      }
    }
    return copy;
  }

  /**
   * Registers injections for require statement measurements (branches)
   * @param  {Object} contract   instrumentation target
   * @param  {Object} expression AST node
   */
  requireBranch(contract, expression) {
    this.addNewBranch(contract, expression);
    // Add fictional if condition
    // add: if (copied condition) {} /*pre*/ require(condition); /*post*/

    const value = contract.instrumented;
    const start = expression.arguments[0].range[0];
    const end = expression.arguments[0].range[1];
    const condition = value.substring(start, end + 1);

    this._createInjectionPoint(contract, expression.range[0], {
      type: "injectRequirePre",
      branchId: contract.branchId,
      // TODO: What is the locationIdx used for
      locationIdx: 0,
      line: expression.loc.start.line,
      condition: condition,
    });
    this._createInjectionPoint(contract, expression.range[1] + 2, {
      type: "injectRequirePost",
      branchId: contract.branchId,
      // TODO: What is the locationIdx used for
      locationIdx: 1,
      line: expression.loc.start.line,
    });
  }

  /**
   * Registers injections for if statement measurements (branches)
   * @param  {Object} contract   instrumentation target
   * @param  {Object} expression AST node
   */
  ifStatement(contract, expression) {
    this.addNewBranch(contract, expression);

    if (expression.trueBody.type === "Block") {
      this._createInjectionPoint(contract, expression.trueBody.range[0] + 1, {
        type: "injectBranch",
        branchId: contract.branchId,
        locationIdx: 0,
        line: expression.loc.start.line,
      });
    }

    if (expression.falseBody && expression.falseBody.type === "IfStatement") {
      // Do nothing - we must be pre-preprocessing
    } else if (expression.falseBody && expression.falseBody.type === "Block") {
      this._createInjectionPoint(contract, expression.falseBody.range[0] + 1, {
        type: "injectBranch",
        branchId: contract.branchId,
        locationIdx: 1,
        line: expression.loc.start.line,
      });
    } else {
      this._createInjectionPoint(contract, expression.trueBody.range[1] + 1, {
        type: "injectEmptyBranch",
        branchId: contract.branchId,
        locationIdx: 1,
        line: expression.loc.start.line,
      });
    }
  }

  /**
   * Registers injections for for statement measurements (branches)
   * @param  {Object} contract   instrumentation target
   * @param  {Object} expression AST node
   */
  forStatement(contract, expression) {
    this.addNewBranch(contract, expression);

    if (expression.body.type === "Block") {
      this._createInjectionPoint(contract, expression.body.range[0] + 1, {
        type: "injectBranch",
        branchId: contract.branchId,
        locationIdx: 0,
        line: expression.loc.start.line,
      });
    }

    // TODO remove this i think
    this._createInjectionPoint(contract, expression.body.range[1] + 1, {
      type: "injectBranch",
      branchId: contract.branchId,
      locationIdx: 1,
      line: expression.loc.start.line,
    });
  }
}

module.exports = SyntestRegistrar;
