import { ContractVisitor } from "./ContractVisitor";

const SolidityParser = require("@solidity-parser/parser");

/**
 * Function map generator for targets.
 *
 * @author Mitchell Olsthoorn
 */
export class TargetMapGenerator {
  /**
   * Generate function map for specified target.
   *
   * @param targetAST The AST of the target
   */
  generate(targetAST: any): {
    targetMap: Map<string, any>;
    functionMap: Map<string, Map<string, any>>;
  } {
    const visitor = new ContractVisitor();
    SolidityParser.visit(targetAST, visitor);
    const targetMap = visitor.getContractMap();
    const functionMap = visitor.getFunctionMap();
    return { targetMap, functionMap };
  }
}
