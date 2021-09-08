import { Statement } from "syntest-framework/dist/testcase/statements/Statement";
import { ActionStatement } from "syntest-framework/dist/testcase/statements/ActionStatement";
import { ConstructorCall } from "./ConstructorCall";
import { TestCaseSampler } from "syntest-framework/dist/testcase/sampling/TestCaseSampler";
import { prng } from "syntest-framework/dist/util/prng";
import { Properties } from "syntest-framework/dist/properties";
import { Parameter } from "syntest-framework/dist/graph/parsing/Parameter";

/**
 * @author Dimitri Stallenberg
 */
export class ObjectFunctionCall extends ActionStatement {
  private readonly _functionName: string;

  private readonly _parent: ConstructorCall;

  /**
   * Constructor
   * @param types the return types of the function
   * @param uniqueId id of the gene
   * @param instance the object to call the function on
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    instance: ConstructorCall,
    functionName: string,
    args: Statement[]
  ) {
    super(types, uniqueId, [...args]);
    this._parent = instance;
    this._functionName = functionName;
  }

  mutate(sampler: TestCaseSampler, depth: number): ObjectFunctionCall {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      // resample the gene
      return <ObjectFunctionCall>(
        sampler.sampleStatement(depth, this.types, "functionCall")
      );
    } else {
      const args = [...this.args.map((a: Statement) => a.copy())];
      if (args.length === 0) return this;

      const index = prng.nextInt(0, args.length - 1);
      args[index] = args[index].mutate(sampler, depth + 1);

      const instance = this._parent;
      return new ObjectFunctionCall(
        this.types,
        this.id,
        instance,
        this.functionName,
        args
      );
    }
  }

  copy() {
    const deepCopyArgs = [...this.args.map((a: Statement) => a.copy())];

    return new ObjectFunctionCall(
      this.types,
      this.id,
      this._parent,
      this.functionName,
      deepCopyArgs
    );
  }

  hasChildren(): boolean {
    // since every object function call has an instance there must be atleast one child
    return true;
  }

  getChildren(): Statement[] {
    return [...this.args];
  }

  getParent(): ConstructorCall {
    return this._parent;
  }

  get functionName(): string {
    return this._functionName;
  }
}
