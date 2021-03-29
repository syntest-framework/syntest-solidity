const SolidityParser = require("@solidity-parser/parser");

const SyntestInjector = require("./injector");
const preprocess = require("solidity-coverage/lib/preprocessor");
const Instrumented = require("solidity-coverage/lib/instrumenter");
const parse = require("./parse");

const { finalizeCFG } = require("syntest-framework");

/**
 * @author Annibale Panichella
 * @author Dimitri Stallenberg
 */
class SyntestInstrumenter extends Instrumented {
  constructor(config = {}) {
    super(config);
    this.injector = new SyntestInjector();
  }

  instrument(contractSource, fileName) {
    const contract = {};

    contract.source = contractSource;
    contract.instrumented = contractSource;

    this._initializeCoverageFields(contract);

    parse.configureStatementCoverage(this.measureStatementCoverage);
    parse.configureFunctionCoverage(this.measureFunctionCoverage);

    // create temp control flow graph
    let cfg = {
      nodes: [],
      edges: [],
    };

    // First, we run over the original contract to get the source mapping.
    let ast = SolidityParser.parse(contract.source, { loc: true, range: true });
    //console.log(JSON.stringify(ast, null, ' '))		    parse[ast.type](contract, ast, cfg);
    parse[ast.type](contract, ast, cfg);
    const retValue = JSON.parse(JSON.stringify(contract)); // Possibly apotropaic.

    // Now, we reset almost everything and use the preprocessor to increase our effectiveness.
    this._initializeCoverageFields(contract);
    contract.instrumented = preprocess(contract.source);

    // Walk the AST, recording injection points
    ast = SolidityParser.parse(contract.instrumented, {
      loc: true,
      range: true,
    });

    const root = ast.children.filter((node) => this._isRootNode(node));

    // reset control flow graph
    cfg = {
      nodes: [],
      edges: [],
    };

    // Handle contracts which only contain import statements
    contract.contractName = root.length ? root[0].name : null;
    parse[ast.type](contract, ast, cfg);
    // refactor cfg

    for (let node of cfg.nodes) {
      node.target = fileName;
    }
    cfg = finalizeCFG(cfg);

    // We have to iterate through these points in descending order
    const sortedPoints = Object.keys(contract.injectionPoints).sort(
      (a, b) => b - a
    );

    sortedPoints.forEach((injectionPoint) => {
      // Line instrumentation has to happen first
      contract.injectionPoints[injectionPoint].sort((a, b) => {
        const injections = ["injectBranch", "injectEmptyBranch", "injectLine"];
        return injections.indexOf(b.type) - injections.indexOf(a.type);
      });

      contract.injectionPoints[injectionPoint].forEach((injection) => {
        this.injector[injection.type](
          contract,
          fileName,
          injectionPoint,
          injection,
          this.instrumentationData
        );
      });
    });

    retValue.runnableLines = contract.runnableLines;
    retValue.contract = contract.instrumented;
    retValue.contractName = contract.contractName;
    retValue.cfg = cfg;

    return retValue;
  }
}

module.exports = SyntestInstrumenter;
