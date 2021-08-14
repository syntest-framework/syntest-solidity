const SolidityParser = require("@solidity-parser/parser");

/**
 * Abstract Syntax Trees (AST) generator for targets.
 *
 * @author Mitchell Olsthoorn
 */
export class ASTGenerator {
  /**
   * Generate Abstract Syntax Tree (AST) for specified target.
   *
   * @param targetSource The source of the target
   */
  generate(targetSource: string): string {
    return SolidityParser.parse(targetSource, {
      loc: true,
      range: true,
    });
  }
}
