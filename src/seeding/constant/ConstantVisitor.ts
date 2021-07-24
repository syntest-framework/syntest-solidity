import { SolidityVisitor } from "../../graph/SolidityVisitor";
import {
  PragmaDirective,
  ImportDirective,
  ContractDefinition,
  UsingForDeclaration,
  StructDefinition,
  ModifierDefinition,
  ModifierInvocation,
  FunctionDefinition,
  EventDefinition,
  EnumValue,
  EnumDefinition,
  VariableDeclaration,
  UserDefinedTypeName,
  FunctionTypeName,
  ElementaryTypeName,
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

  ImportDirective(node: ImportDirective): void {
    this.pool.addString(node.path);
    node.symbolAliases.forEach((symbolAlias) => {
      symbolAlias.forEach((alias) => {
        this.pool.addString(alias);
      });
    });
    this.pool.addString(node.unitAlias);
  }

  PragmaDirective(node: PragmaDirective): void {
    this.pool.addString(node.name);
    this.pool.addString(node.value);
  }

  ContractDefinition(node: ContractDefinition): void {
    this.pool.addString(node.name);
  }

  UsingForDeclaration(node: UsingForDeclaration): void {
    this.pool.addString(node.libraryName);
  }

  StructDefinition(node: StructDefinition): void {
    this.pool.addString(node.name);
  }

  ModifierDefinition(node: ModifierDefinition): void {
    this.pool.addString(node.name);
  }

  ModifierInvocation(node: ModifierInvocation): void {
    this.pool.addString(node.name);
  }

  FunctionDefinition(node: FunctionDefinition): void {
    this.pool.addString(node.name);
  }

  EventDefinition(node: EventDefinition): void {
    this.pool.addString(node.name);
  }

  EnumValue(node: EnumValue): void {
    this.pool.addString(node.name);
  }

  EnumDefinition(node: EnumDefinition): void {
    this.pool.addString(node.name);
  }

  VariableDeclaration(node: VariableDeclaration): void {
    this.pool.addString(node.name);
  }

  UserDefinedTypeName(node: UserDefinedTypeName): void {
    this.pool.addString(node.namePath);
  }

  FunctionTypeName(node: FunctionTypeName): void {
    this.pool.addString(node.stateMutability);
    this.pool.addString(node.visibility);
  }

  ElementaryTypeName(node: ElementaryTypeName): void {
    this.pool.addString(node.name);
  }

  StringLiteral(node: StringLiteral): void {
    this.pool.addString(node.value);
  }

  NumberLiteral(node: NumberLiteral): void {
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
}
