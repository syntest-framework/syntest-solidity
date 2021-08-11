import { SolidityVisitor } from "../SolidityVisitor";
import {
  ContractDefinition,
  FunctionDefinition,
} from "@solidity-parser/parser";

/**
 * Visits the AST nodes of a contract to find all libraries with public and external functions.
 *
 * @author Mitchell Olsthoorn
 */
export class LibraryVisitor implements SolidityVisitor {
  public libraries = [];
  protected current;

  ContractDefinition(node: ContractDefinition): void {
    if (node.kind == "library") {
      this.current = node.name;
    } else {
      this.current = null;
    }
  }

  FunctionDefinition(node: FunctionDefinition): void {
    if (
      this.current &&
      (node.visibility == "public" || node.visibility == "external") &&
      !this.libraries.includes(this.current)
    ) {
      this.libraries.push(this.current);
    }
  }
}
