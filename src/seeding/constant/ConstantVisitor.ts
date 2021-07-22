import { SolidityVisitor } from "../../graph/SolidityVisitor";
import {
  SourceUnit,
  PragmaDirective,
  ImportDirective,
  ContractDefinition,
  InheritanceSpecifier,
  StateVariableDeclaration,
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
  Mapping,
  ArrayTypeName,
  FunctionTypeName,
  Block,
  ExpressionStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  InlineAssemblyStatement,
  DoWhileStatement,
  ContinueStatement,
  BreakStatement,
  ReturnStatement,
  EmitStatement,
  ThrowStatement,
  VariableDeclarationStatement,
  ElementaryTypeName,
  AssemblyBlock,
  AssemblyCall,
  AssemblyLocalDefinition,
  AssemblyAssignment,
  AssemblyStackAssignment,
  LabelDefinition,
  AssemblySwitch,
  AssemblyCase,
  AssemblyFunctionDefinition,
  AssemblyFunctionReturns,
  AssemblyFor,
  AssemblyIf,
  AssemblyLiteral,
  SubAssembly,
  TupleExpression,
  TypeNameExpression,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  Identifier,
  BinaryOperation,
  Conditional,
  IndexAccess,
  MemberAccess,
  Break,
  HexNumber,
  DecimalNumber,
  Continue,
} from "@solidity-parser/parser";

/**
 * Visits the AST nodes of a contract to find all constants
 *
 * @author Mitchell Olsthoorn
 */
export class ConstantVisitor implements SolidityVisitor {
  protected values = []

  SourceUnit(node: SourceUnit): void {
  }

  ImportDirective(node: ImportDirective): void {
  }

  PragmaDirective(node: PragmaDirective): void {
  }

  ContractDefinition(node: ContractDefinition): void {
    this.values.push(node.name)
  }

  InheritanceSpecifier(node: InheritanceSpecifier): void {
  }

  StateVariableDeclaration(node: StateVariableDeclaration): void {
  }

  UsingForDeclaration(node: UsingForDeclaration): void {
  }

  StructDefinition(node: StructDefinition): void {
  }

  ModifierDefinition(node: ModifierDefinition): void {
    this.values.push(node.name)
  }

  ModifierInvocation(node: ModifierInvocation): void {
    this.values.push(node.name)
  }

  FunctionDefinition(node: FunctionDefinition): void {
    this.values.push(node.name)
  }

  EventDefinition(node: EventDefinition): void {
  }

  EnumValue(node: EnumValue): void {
  }

  EnumDefinition(node: EnumDefinition): void {
  }

  VariableDeclaration(node: VariableDeclaration): void {
    this.values.push(node.name)
  }

  UserDefinedTypeName(node: UserDefinedTypeName): void {
  }

  Mapping(node: Mapping): void {
  }

  ArrayTypeName(node: ArrayTypeName): void {
  }

  FunctionTypeName(node: FunctionTypeName): void {
  }

  Block(node: Block): void {
  }

  ExpressionStatement(node: ExpressionStatement): void {
  }

  IfStatement(node: IfStatement): void {
  }

  WhileStatement(node: WhileStatement): void {
  }

  ForStatement(node: ForStatement): void {
  }

  InlineAssemblyStatement(node: InlineAssemblyStatement): void {
  }

  DoWhileStatement(node: DoWhileStatement): void {
  }

  ContinueStatement(node: ContinueStatement): void {
  }

  BreakStatement(node: BreakStatement): void {
  }

  ReturnStatement(node: ReturnStatement): void {
  }

  EmitStatement(node: EmitStatement): void {
  }

  ThrowStatement(node: ThrowStatement): void {
  }

  VariableDeclarationStatement(node: VariableDeclarationStatement): void {
  }

  ElementaryTypeName(node: ElementaryTypeName): void {
  }

  AssemblyBlock(node: AssemblyBlock): void {
  }

  AssemblyCall(node: AssemblyCall): void {
  }

  AssemblyLocalDefinition(node: AssemblyLocalDefinition): void {
  }

  AssemblyAssignment(node: AssemblyAssignment): void {
  }

  AssemblyStackAssignment(node: AssemblyStackAssignment): void {
  }

  LabelDefinition(node: LabelDefinition): void {
  }

  AssemblySwitch(node: AssemblySwitch): void {
  }

  AssemblyCase(node: AssemblyCase): void {
  }

  AssemblyFunctionDefinition(node: AssemblyFunctionDefinition): void {
  }

  AssemblyFunctionReturns(node: AssemblyFunctionReturns): void {
  }

  AssemblyFor(node: AssemblyFor): void {
  }

  AssemblyIf(node: AssemblyIf): void {
  }

  AssemblyLiteral(node: AssemblyLiteral): void {
  }

  SubAssembly(node: SubAssembly): void {
  }

  TupleExpression(node: TupleExpression): void {
  }

  TypeNameExpression(node: TypeNameExpression): void {
  }

  StringLiteral(node: StringLiteral): void {
    this.values.push(node.value)
  }

  NumberLiteral(node: NumberLiteral): void {
    this.values.push(node.number)
  }

  BooleanLiteral(node: BooleanLiteral): void {
  }

  Identifier(node: Identifier): void {
    if (!["require", "_"].includes(node.name)) this.values.push(node.name)
  }

  BinaryOperation(node: BinaryOperation): void {
  }

  Conditional(node: Conditional): void {
  }

  IndexAccess(node: IndexAccess): void {
  }

  MemberAccess(node: MemberAccess): void {
  }

  Break(node: Break): void {
  }

  HexNumber(node: HexNumber): void {
  }

  DecimalNumber(node: DecimalNumber): void {
  }

  Continue(node: Continue): void {
  }

  "SourceUnit:exit"(node: SourceUnit): void {
  }

  "PragmaDirective:exit"(node: PragmaDirective): void {
  }

  "ImportDirective:exit"(node: ImportDirective): void {
  }

  "ContractDefinition:exit"(node: ContractDefinition): void {
  }

  "InheritanceSpecifier:exit"(node: InheritanceSpecifier): void {
  }

  "StateVariableDeclaration:exit"(node: StateVariableDeclaration): void {
  }

  "UsingForDeclaration:exit"(node: UsingForDeclaration): void {
  }

  "StructDefinition:exit"(node: StructDefinition): void {
  }

  "ModifierDefinition:exit"(node: ModifierDefinition): void {
  }

  "ModifierInvocation:exit"(node: ModifierInvocation): void {
  }

  "FunctionDefinition:exit"(node: FunctionDefinition): void {
  }

  "EventDefinition:exit"(node: EventDefinition): void {
  }

  "EnumValue:exit"(node: EnumValue): void {
  }

  "EnumDefinition:exit"(node: EnumDefinition): void {
  }

  "VariableDeclaration:exit"(node: VariableDeclaration): void {
  }

  "UserDefinedTypeName:exit"(node: UserDefinedTypeName): void {
  }

  "Mapping:exit"(node: Mapping): void {
  }

  "ArrayTypeName:exit"(node: ArrayTypeName): void {
  }

  "FunctionTypeName:exit"(node: FunctionTypeName): void {
  }

  "Block:exit"(node: Block): void {
  }

  "ExpressionStatement:exit"(node: ExpressionStatement): void {
  }

  "IfStatement:exit"(node: IfStatement): void {
  }

  "WhileStatement:exit"(node: WhileStatement): void {
  }

  "ForStatement:exit"(node: ForStatement): void {
  }

  "InlineAssemblyStatement:exit"(node: InlineAssemblyStatement): void {
  }

  "DoWhileStatement:exit"(node: DoWhileStatement): void {
  }

  "ContinueStatement:exit"(node: ContinueStatement): void {
  }

  "BreakStatement:exit"(node: BreakStatement): void {
  }

  "ReturnStatement:exit"(node: ReturnStatement): void {
  }

  "EmitStatement:exit"(node: EmitStatement): void {
  }

  "ThrowStatement:exit"(node: ThrowStatement): void {
  }

  "VariableDeclarationStatement:exit"(node: VariableDeclarationStatement): void {
  }

  "ElementaryTypeName:exit"(node: ElementaryTypeName): void {
  }

  "AssemblyBlock:exit"(node: AssemblyBlock): void {
  }

  "AssemblyCall:exit"(node: AssemblyCall): void {
  }

  "AssemblyLocalDefinition:exit"(node: AssemblyLocalDefinition): void {
  }

  "AssemblyAssignment:exit"(node: AssemblyAssignment): void {
  }

  "AssemblyStackAssignment:exit"(node: AssemblyStackAssignment): void {
  }

  "LabelDefinition:exit"(node: LabelDefinition): void {
  }

  "AssemblySwitch:exit"(node: AssemblySwitch): void {
  }

  "AssemblyCase:exit"(node: AssemblyCase): void {
  }

  "AssemblyFunctionDefinition:exit"(node: AssemblyFunctionDefinition): void {
  }

  "AssemblyFunctionReturns:exit"(node: AssemblyFunctionReturns): void {
  }

  "AssemblyFor:exit"(node: AssemblyFor): void {
  }

  "AssemblyIf:exit"(node: AssemblyIf): void {
  }

  "AssemblyLiteral:exit"(node: AssemblyLiteral): void {
  }

  "SubAssembly:exit"(node: SubAssembly): void {
  }

  "TupleExpression:exit"(node: TupleExpression): void {
  }

  "TypeNameExpression:exit"(node: TypeNameExpression): void {
  }

  "NumberLiteral:exit"(node: NumberLiteral): void {
  }

  "BooleanLiteral:exit"(node: BooleanLiteral): void {
  }

  "Identifier:exit"(node: Identifier): void {
  }

  "BinaryOperation:exit"(node: BinaryOperation): void {
  }

  "Conditional:exit"(node: Conditional): void {
  }

  "IndexAccess:exit"(node: IndexAccess): void {
  }

  "MemberAccess:exit"(node: MemberAccess): void {
  }

  "HexNumber:exit"(node: HexNumber): void {
  }

  "DecimalNumber:exit"(node: DecimalNumber): void {
  }

  "Break:exit"(node: Break): void {
  }

  "Continue:exit"(node: Continue): void {
  }
}
