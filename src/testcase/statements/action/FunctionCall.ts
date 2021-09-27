import { Statement } from "syntest-framework";
import { ActionStatement } from "syntest-framework";
import { TestCaseSampler } from "syntest-framework";
import { prng } from "syntest-framework";
import { Properties } from "syntest-framework";
import { Parameter } from "syntest-framework";

/**
 * @author Dimitri Stallenberg
 */
export class FunctionCall extends ActionStatement {
  get functionName(): string {
    return this._functionName;
  }

  private readonly _functionName: string;

  /**
   * Constructor
   * @param types the return types of the function
   * @param uniqueId id of the gene
   * @param functionName the name of the function
   * @param args the arguments of the function
   */
  constructor(
    types: Parameter[],
    uniqueId: string,
    functionName: string,
    args: Statement[]
  ) {
    super(types, uniqueId, [...args]);
    this._functionName = functionName;
  }

  mutate(sampler: TestCaseSampler, depth: number) {
    if (prng.nextBoolean(Properties.resample_gene_probability)) {
      // resample the gene
      return sampler.sampleStatement(depth, this.types, "functionCall");
    } else if (!this.args.length) {
      return this.copy();
    } else {
      // randomly mutate one of the args
      const args = [...this.args.map((a: Statement) => a.copy())];
      const index = prng.nextInt(0, args.length - 1);
      args[index] = args[index].mutate(sampler, depth + 1);

      return new FunctionCall(this.types, this.id, this.functionName, args);
    }
  }

  copy() {
    const deepCopyArgs = [...this.args.map((a: Statement) => a.copy())];

    return new FunctionCall(
      this.types,
      this.id,
      this.functionName,
      deepCopyArgs
    );
  }

  hasChildren(): boolean {
    return !!this.args.length;
  }

  getChildren(): Statement[] {
    return [...this.args];
  }
}
