import { SolidityVisitor } from "./SolidityVisitor";
import { ImportDirective } from "@solidity-parser/parser";

/**
 * Visits the AST nodes of a contract to find all import statements
 *
 * @author Mitchell Olsthoorn
 */
export class ImportVisitor implements SolidityVisitor {
  public imports = [];

  ImportDirective(node: ImportDirective): void {
    this.imports.push(node.path);
  }
}
