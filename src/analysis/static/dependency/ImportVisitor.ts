import { SolidityVisitor } from "../SolidityVisitor";
import { ImportDirective } from "@solidity-parser/parser";

/**
 * Visits the AST nodes of a contract to find all import statements
 *
 * @author Mitchell Olsthoorn
 */
export class ImportVisitor implements SolidityVisitor {
  protected _imports = new Set<string>();

  /**
   * @inheritDoc
   */
  ImportDirective(node: ImportDirective): void {
    this._imports.add(node.path);
  }

  /**
   * Return the found imports.
   */
  getImports(): string[] {
    return Array.from(this._imports);
  }
}
