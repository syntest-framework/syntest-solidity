const semver = require("semver");
const Registrar = require("./registrar");
const register = new Registrar();

const FILE_SCOPED_ID = "fileScopedId";
const parse = {};

// Utilities
parse.configureStatementCoverage = function (val) {
  register.measureStatementCoverage = val;
};

parse.configureFunctionCoverage = function (val) {
  register.measureFunctionCoverage = val;
};

// Nodes
parse.AssignmentExpression = function (
  contract,
  expression,
  graph,
  currentNode
) {
  register.statement(contract, expression);
};

parse.Block = function (contract, expression, graph, currentNode) {
  // if (expression.statements.length > 1 && currentNode !== null) {
  //   graph.nodes[currentNode].root = true
  //   currentNode = null
  // }
  for (let x = 0; x < expression.statements.length; x++) {
    register.line(contract, expression.statements[x]);
    parse[expression.statements[x].type] &&
      parse[expression.statements[x].type](
        contract,
        expression.statements[x],
        graph,
        graph.nodes[graph.nodes.length - 1].id
      );
  }
};

parse.BinaryOperation = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
};

parse.FunctionCall = function (contract, expression, graph, currentNode) {
  // In any given chain of call expressions, only the last one will fail this check.
  // This makes sure we don't instrument a chain of expressions multiple times.
  if (expression.expression.type !== "FunctionCall") {
    register.statement(contract, expression);
    if (expression.expression.name === "require") {
      parse.RequireStatement(contract, expression, graph, currentNode);
    }
    parse[expression.expression.type] &&
      parse[expression.expression.type](
        contract,
        expression.expression,
        graph,
        currentNode
      );
  } else {
    parse[expression.expression.type] &&
      parse[expression.expression.type](
        contract,
        expression.expression,
        graph,
        currentNode
      );
  }
};

parse.RequireStatement = function (contract, expression, graph, currentNode) {
  register.requireBranch(contract, expression);

  // TODO variables
  /**/

  if (currentNode !== null && currentNode !== undefined) {
    graph.edges.push({
      from: currentNode,
      to: graph.nodes.length,
      type: "-",
    });
  }

  currentNode = graph.nodes.length;

  graph.nodes.push({
    id: currentNode,
    root: true,
    splitPoint: true,
    line: expression.loc.start.line,
  });

  let leftNode = graph.nodes.length;

  graph.nodes.push({
    id: leftNode,
    branchId: contract.branchId,
    requireStatement: true,
    locationIdx: 0,
    line: expression.loc.start.line,
    type: "false",
  });

  graph.edges.push({
    from: currentNode,
    to: leftNode,
    type: "false",
  });

  let rightNode = graph.nodes.length;

  graph.nodes.push({
    id: rightNode,
    branchId: contract.branchId,
    requireStatement: true,
    locationIdx: 1,
    line: expression.loc.end.line,
    type: "true",
  });

  graph.edges.push({
    from: currentNode,
    to: rightNode,
    type: "true",
  });

  /**/
};

parse.Conditional = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
  // TODO: Investigate node structure
  // There are potential substatements here we aren't measuring
};

parse.ContractDefinition = function (contract, expression, graph, currentNode) {
  parse.ContractOrLibraryStatement(contract, expression, graph, currentNode);
};

parse.ContractOrLibraryStatement = function (
  contract,
  expression,
  graph,
  currentNode
) {
  // We need to define a method to pass coverage hashes into at top of each contract.
  // This lets us get a fresh stack for the hash and avoid stack-too-deep errors.
  if (expression.kind !== "interface") {
    let start = 0;

    // It's possible a base contract will have constructor string arg
    // which contains an open curly brace. Skip ahead pass the bases...
    if (expression.baseContracts && expression.baseContracts.length) {
      for (let base of expression.baseContracts) {
        if (base.range[1] > start) {
          start = base.range[1];
        }
      }
    } else {
      start = expression.range[0];
    }

    const end = contract.instrumented.slice(start).indexOf("{") + 1;
    const loc = start + end;

    contract.contractName = expression.name;

    contract.injectionPoints[loc]
      ? contract.injectionPoints[loc].push({
          type: "injectHashMethod",
          contractName: expression.name,
        })
      : (contract.injectionPoints[loc] = [
          { type: "injectHashMethod", contractName: expression.name },
        ]);
  }

  if (expression.subNodes) {
    contract.isContractScoped = true;
    expression.subNodes.forEach((construct) => {
      parse[construct.type] &&
        parse[construct.type](contract, construct, graph, currentNode);
    });
    // Unset flag...
    contract.isContractScoped = false;
  }
};

parse.EmitStatement = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
};

parse.ExpressionStatement = function (contract, content, graph, currentNode) {
  parse[content.expression.type] &&
    parse[content.expression.type](
      contract,
      content.expression,
      graph,
      currentNode
    );
};

parse.ForStatement = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
  register.forStatement(contract, expression);

  if (currentNode !== null && currentNode !== undefined) {
    graph.edges.push({
      from: currentNode,
      to: graph.nodes.length,
      type: "-",
    });
  }

  currentNode = graph.nodes.length;

  graph.nodes.push({
    id: currentNode,
    root: true,
    line: expression.loc.start.line,
    condition: expression.conditionExpression.operator,
    loop: true,
  });

  let loopNode = graph.nodes.length;

  graph.nodes.push({
    id: loopNode,
    branchId: contract.branchId,
    locationIdx: 0,
    line: expression.body.loc.start.line,
    type: "true",
    // root: true,
  });

  graph.edges.push({
    from: currentNode,
    to: loopNode,
    type: "true",
  });

  parse[expression.body.type] &&
    parse[expression.body.type](contract, expression.body, graph, loopNode);

  let rightNode = graph.nodes.length;

  graph.nodes.push({
    id: rightNode,
    branchId: contract.branchId,
    locationIdx: 1,
    line: expression.body.loc.end.line,
    type: "false",
    endLoop: true,
  });

  graph.edges.push({
    from: currentNode,
    to: rightNode,
    type: "false",
  });
};

parse.FunctionDefinition = function (contract, expression, graph, currentNode) {
  parse.Modifiers(contract, expression.modifiers, graph, currentNode);
  if (expression.body) {
    // Skip fn & statement instrumentation for `receive` methods to
    // minimize gas distortion
    expression.name === null && expression.isReceiveEther
      ? (register.trackStatements = false)
      : register.functionDeclaration(contract, expression, graph, currentNode);

    currentNode = graph.nodes.length;

    graph.nodes.push({
      id: currentNode,
      absoluteRoot: true,
      root: true,
      line: expression.loc.start.line,
      functionDefinition: expression.name || "constructor",
    });

    // currentNode = graph.nodes.length
    //
    // graph.nodes.push({
    //   id: currentNode,
    //   line: expression.loc.start.line
    // })
    //
    // graph.edges.push({
    //   from: currentNode - 1,
    //   to: currentNode,
    //   type: '-'
    // })

    parse[expression.body.type] &&
      parse[expression.body.type](
        contract,
        expression.body,
        graph,
        currentNode
      );
    register.trackStatements = true;
  }
};

parse.IfStatement = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
  register.ifStatement(contract, expression);

  // TODO variables

  if (currentNode !== null && currentNode !== undefined) {
    graph.edges.push({
      from: currentNode,
      to: graph.nodes.length,
      type: "-",
    });
  }

  currentNode = graph.nodes.length;

  graph.nodes.push({
    id: currentNode,
    root: true,
    splitPoint: true,
    line: expression.loc.start.line,
    condition: expression.condition.operator,
  });

  let leftNode = graph.nodes.length;

  graph.nodes.push({
    id: leftNode,
    branchId: contract.branchId,
    locationIdx: 0,
    line: expression.trueBody.loc.start.line,
    type: "true",
  });

  graph.edges.push({
    from: currentNode,
    to: leftNode,
    type: "true",
  });

  parse[expression.trueBody.type] &&
    parse[expression.trueBody.type](
      contract,
      expression.trueBody,
      graph,
      leftNode
    );

  if (expression.falseBody && expression.falseBody.type === "Block") {
    let rightNode = graph.nodes.length;

    graph.nodes.push({
      id: rightNode,
      branchId: contract.branchId,
      locationIdx: 1,
      line: expression.falseBody.loc.start.line,
      type: "false",
    });

    graph.edges.push({
      from: currentNode,
      to: rightNode,
      type: "false",
    });

    parse[expression.falseBody.type] &&
      parse[expression.falseBody.type](
        contract,
        expression.falseBody,
        graph,
        rightNode
      );
  } else {
    let rightNode = graph.nodes.length;

    graph.nodes.push({
      id: rightNode,
      branchId: contract.branchId,
      locationIdx: 1,
      line: expression.trueBody.loc.start.line,
      type: "false",
    });

    graph.edges.push({
      from: currentNode,
      to: rightNode,
      type: "false",
    });
  }
};

// TODO: Investigate Node structure
/*parse.MemberAccess = function(contract, expression, graph, currentNode) {
  parse[expression.object.type] &&
  parse[expression.object.type](contract, expression.object, graph, currentNode);
};*/

parse.Modifiers = function (contract, modifiers, graph, newNode) {
  if (modifiers) {
    modifiers.forEach((modifier) => {
      parse[modifier.type] &&
        parse[modifier.type](contract, modifier, graph, newNode);
    });
  }
};

parse.ModifierDefinition = function (contract, expression, graph, currentNode) {
  register.functionDeclaration(contract, expression, graph, currentNode);
  parse[expression.body.type] &&
    parse[expression.body.type](contract, expression.body, graph, currentNode);
};

parse.NewExpression = function (contract, expression, graph, currentNode) {
  parse[expression.typeName.type] &&
    parse[expression.typeName.type](
      contract,
      expression.typeName,
      graph,
      currentNode
    );
};

parse.PragmaDirective = function (contract, expression) {
  let minVersion;

  // Some solidity pragmas crash semver (ex: ABIEncoderV2)
  try {
    minVersion = semver.minVersion(expression.value);
  } catch (e) {
    return;
  }

  // pragma abicoder v2 passes the semver test above but needs to be ignored
  if (expression.name === "abicoder") {
    return;
  }

  // From solc >=0.7.4, every file should have instrumentation methods
  // defined at the file level which file scoped fns can use...
  if (semver.lt("0.7.3", minVersion)) {
    const start = expression.range[0];
    const end = contract.instrumented.slice(start).indexOf(";") + 1;
    const loc = start + end;

    const injectionObject = {
      type: "injectHashMethod",
      contractName: FILE_SCOPED_ID,
      isFileScoped: true,
    };

    contract.injectionPoints[loc] = [injectionObject];
  }
};

parse.SourceUnit = function (contract, expression, graph, currentNode) {
  expression.children.forEach((construct) => {
    parse[construct.type] &&
      parse[construct.type](contract, construct, graph, currentNode);
  });
};

parse.ReturnStatement = function (contract, expression, graph, currentNode) {
  if (currentNode !== null && currentNode !== undefined) {
    graph.nodes[currentNode].final = true;
  }

  register.statement(contract, expression);
};

// TODO:Investigate node structure
/*parse.UnaryOperation = function(contract, expression, graph, currentNode) {
  parse[subExpression.argument.type] &&
  parse[subExpression.argument.type](contract, expression.argument, graph, currentNode);
};*/

parse.TryStatement = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
  parse[expression.body.type] &&
    parse[expression.body.type](contract, expression.body, graph, currentNode);

  for (let x = 0; x < expression.catchClauses.length; x++) {
    parse[expression.catchClauses[x].body.type] &&
      parse[expression.catchClauses[x].body.type](
        contract,
        expression.catchClauses[x].body,
        graph,
        currentNode
      );
  }
};

parse.UsingStatement = function (contract, expression, graph, currentNode) {
  parse[expression.for.type] &&
    parse[expression.for.type](contract, expression.for, graph, currentNode);
};

parse.VariableDeclarationStatement = function (
  contract,
  expression,
  graph,
  currentNode
) {
  register.statement(contract, expression);
};

parse.WhileStatement = function (contract, expression, graph, currentNode) {
  register.statement(contract, expression);
  register.forStatement(contract, expression);

  if (currentNode !== null && currentNode !== undefined) {
    graph.edges.push({
      from: currentNode,
      to: graph.nodes.length,
      type: "-",
    });
  }

  currentNode = graph.nodes.length;

  graph.nodes.push({
    id: currentNode,
    root: true,
    line: expression.loc.start.line,
    condition: expression.condition.operator,
    loop: true,
  });

  let loopNode = graph.nodes.length;

  graph.nodes.push({
    id: loopNode,
    branchId: contract.branchId,
    locationIdx: 0,
    line: expression.body.loc.start.line,
    type: "true",
    // root: true,
  });

  graph.edges.push({
    from: currentNode,
    to: loopNode,
    type: "true",
  });

  parse[expression.body.type] &&
    parse[expression.body.type](contract, expression.body, graph, loopNode);

  let rightNode = graph.nodes.length;

  graph.nodes.push({
    id: rightNode,
    line: expression.body.loc.end.line,
    branchId: contract.branchId,
    locationIdx: 1,
    type: "false",
    endLoop: true,
  });

  graph.edges.push({
    from: currentNode,
    to: rightNode,
    type: "false",
  });
};

module.exports = parse;
