import { SolidityVisitor } from "../../analysis/static/SolidityVisitor";
import {
  EnumValue,
  VariableDeclaration,
  StringLiteral,
  NumberLiteral,
  Identifier,
  IndexAccess,
  MemberAccess,
  HexNumber,
  DecimalNumber,
} from "@solidity-parser/parser";
import { ConstantPool } from "./ConstantPool";

/**
 * Visits the AST nodes of a contract to find all constants
 *
 * @author Mitchell Olsthoorn
 */
export class ConstantVisitor implements SolidityVisitor {
  protected pool: ConstantPool;

  constructor(pool: ConstantPool) {
    this.pool = pool;
  }

  public getConstantPool(): ConstantPool {
    return this.pool;
  }

  EnumValue(node: EnumValue): void {
    this.pool.addString(node.name);
  }

  VariableDeclaration(node: VariableDeclaration): void {
    this.pool.addString(node.name);
  }

  StringLiteral(node: StringLiteral): void {
    if (this._isAddress(node.value)) {
      this.pool.addAddress(node.value);
      return;
    }

    this.pool.addString(node.value);
  }

  NumberLiteral(node: NumberLiteral): void {
    if (this._isAddress(node.number)) {
      this.pool.addAddress(node.number);
      return;
    }

    this.pool.addNumber(parseInt(node.number));
  }

  Identifier(node: Identifier): void {
    if (!["require", "_"].includes(node.name)) this.pool.addString(node.name);
  }

  IndexAccess(node: IndexAccess): void {
    // TODO: check for index numbers
  }

  MemberAccess(node: MemberAccess): void {
    this.pool.addString(node.memberName);
  }

  HexNumber(node: HexNumber): void {
    // TODO: check for addresses
    this.pool.addString(node.value);
  }

  DecimalNumber(node: DecimalNumber): void {
    this.pool.addNumber(parseFloat(node.value));
  }

  protected _isAddress(value: string): boolean {
    if (value === "0x0") return true;

    return value.startsWith("0x") && value.length == 42;
  }
}
