import { Statement } from "syntest-framework/dist/testcase/statements/Statement";
import { ActionStatement } from "syntest-framework/dist/testcase/statements/ActionStatement";
import { prng } from "syntest-framework/dist/util/prng";
import { EncodingSampler } from "syntest-framework/dist/search/EncodingSampler";
import { SolidityTestCase } from "../../SolidityTestCase";
import { AddressStatement } from "../AddressStatement";

/**
 * @author Dimitri Stallenberg
 * @author Annibale Panichella
 */
export class ConstructorCall extends ActionStatement {
  get constructorName(): string {
    return this._constructorName;
  }

  private _constructorName: string;
  private _calls: ActionStatement[];
  private _sender: AddressStatement;

  /**
   * Constructor
   * @param type the return type of the constructor
   * @param uniqueId optional argument
   * @param constructorName the name of the constructor
   * @param args the arguments of the constructor
   * @param calls the methods calls of the constructor
   * @param sender the sender of the message
   */
  constructor(
    type: string,
    uniqueId: string,
    constructorName: string,
    args: Statement[],
    calls: ActionStatement[],
    sender: AddressStatement
  ) {
    super(type, uniqueId, args);
    this._constructorName = constructorName;
    this._calls = calls;
    this._sender = sender;
  }

  mutate(sampler: EncodingSampler<SolidityTestCase>, depth: number) {
    if (this.args.length > 0) {
      const args = [...this.args.map((a: Statement) => a.copy())];
      const index = prng.nextInt(0, args.length - 1);
      if (args[index] !== undefined)
        args[index] = args[index].mutate(sampler, depth + 1);
    }

    let changed = false;
    if (
      prng.nextDouble(0, 1) <= 1.0 / 3.0 &&
      this.getMethodCalls().length > 1
    ) {
      this.deleteMethodCall();
      changed = true;
    }
    if (prng.nextDouble(0, 1) <= 1.0 / 3.0) {
      this.replaceMethodCall(depth, sampler);
      changed = true;
    }
    if (prng.nextDouble(0, 1) <= 1.0 / 3.0) {
      this.addMethodCall(depth, sampler);
      changed = true;
    }

    if (!this.hasMethodCalls()) {
      this.addMethodCall(depth, sampler);
      changed = true;
    }

    if (!changed) {
      this.replaceMethodCall(depth, sampler);
      this.addMethodCall(depth, sampler);
    }

    return this;
  }

  protected addMethodCall(
    depth: number,
    sampler: EncodingSampler<SolidityTestCase>
  ) {
    let count = 0;
    while (prng.nextDouble(0, 1) <= Math.pow(0.5, count) && count < 10) {
      const index = prng.nextInt(0, this._calls.length);

      // get a random test case and we extract one of its method call
      // ugly solution for now. But we have to fix with proper refactoring
      const randomTest: SolidityTestCase = sampler.sample();
      this._calls.splice(
        index,
        0,
        (randomTest.root as ConstructorCall).getMethodCalls()[0]
      );
      count++;
    }
  }

  protected replaceMethodCall(
    depth: number,
    sampler: EncodingSampler<SolidityTestCase>
  ) {
    if (this.hasMethodCalls()) {
      const calls = this.getMethodCalls();
      const index = prng.nextInt(0, calls.length - 1);
      this.setMethodCall(index, calls[index].mutate(sampler, depth));
    }
  }

  protected deleteMethodCall() {
    if (this.hasMethodCalls()) {
      const calls = this.getMethodCalls();
      const index = prng.nextInt(0, calls.length - 1);
      this._calls.splice(index, 1);
    }
  }

  copy() {
    const deepCopyArgs = [...this.args.map((a: Statement) => a.copy())];
    const deepCopyCalls = [
      ...this._calls.map((a: ActionStatement) => a.copy()),
    ];
    return new ConstructorCall(
      this.type,
      this.id,
      this.constructorName,
      deepCopyArgs,
      deepCopyCalls,
      this._sender.copy()
    );
  }

  getMethodCalls(): ActionStatement[] {
    return [...this._calls];
  }

  setMethodCall(index: number, call: ActionStatement) {
    this._calls[index] = call;
  }

  hasMethodCalls(): boolean {
    return this._calls.length > 0;
  }

  setSender(sender: AddressStatement) {
    this._sender = sender;
  }

  getSender(): AddressStatement {
    return this._sender;
  }
}
