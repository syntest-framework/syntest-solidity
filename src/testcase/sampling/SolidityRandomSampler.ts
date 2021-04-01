import {
  BoolStatement,
  ConstructorCall,
  getProperty,
  NumericStatement,
  ObjectFunctionCall,
  ActionStatement,
  prng,
  Statement,
  StringStatement,
  TestCase,
} from "syntest-framework";
import { SoliditySampler } from "./SoliditySampler";
import { AddressStatement } from "../AddressStatement";
import BigNumber from "bignumber.js";
import { ByteStatement } from "../statements/ByteStatement";
import { SoliditySubject } from "../../search/SoliditySubject";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export class SolidityRandomSampler extends SoliditySampler {
  /**
   * Constructor
   */
  constructor(subject: SoliditySubject<TestCase>) {
    super(subject);
  }

  sample(): TestCase {
    const root = this.sampleConstructor(0);

    const nCalls = prng.nextInt(1, 5);
    for (let index = 0; index <= nCalls; index++) {
      const call = this.sampleMethodCall(root);
      root.setMethodCall(index, call as ActionStatement);
    }
    return new TestCase(root);
  }

  sampleMethodCall(root: ConstructorCall): ObjectFunctionCall {
    const actions = this._subject.getPossibleActions("function");

    const action = prng.pickOne(actions);

    const args: Statement[] = [];

    for (const arg of action.args) {
      if (arg.type != "") args.push(this.sampleArgument(1, arg.type, arg.bits));
    }

    const call = new ObjectFunctionCall(
      action.returnType,
      prng.uniqueId(),
      root,
      action.name,
      args
    );
    return call;
  }

  sampleConstructor(depth: number): ConstructorCall {
    const constructors = this._subject.getPossibleActions("constructor");
    if (constructors.length > 0) {
      const action = prng.pickOne(
        this._subject.getPossibleActions("constructor")
      );

      const args: Statement[] = [];
      for (const arg of action.args) {
        if (arg.type != "")
          args.push(this.sampleArgument(1, arg.type, arg.bits));
      }

      return new ConstructorCall(
        action.name,
        prng.uniqueId(),
        `${action.name}`,
        args,
        []
      );
    } else {
      // if no constructors is available, we invoke the default (implicit) constructor
      return new ConstructorCall(
        this._subject.name,
        prng.uniqueId(),
        `${this._subject.name}`,
        [],
        []
      );
    }
  }

  sampleArgument(depth: number, type: string, bits: number): Statement {
    // check depth to decide whether to pick a variable
    if (depth >= getProperty("max_depth")) {
      // TODO or take an already available variable
      if (type.includes("int")) {
        return this.sampleNumericGene(depth, type, bits);
      } else {
        return this.sampleStatement(depth, type);
      }
    }

    if (
      this._subject.getPossibleActions().filter((a) => a.type === type)
        .length &&
      prng.nextBoolean(getProperty("sample_func_as_arg"))
    ) {
      // Pick function
      // TODO or take an already available functionCall

      return this.sampleObjectFunctionCall(depth, type);
    } else {
      // Pick variable
      // TODO or take an already available variable
      if (type.includes("int")) {
        return this.sampleNumericGene(depth, type, bits);
      } else {
        return this.sampleStatement(depth, type);
      }
    }
  }

  sampleNumericGene(depth: number, type: string, bits: number): Statement {
    let max = new BigNumber(2).pow(bits - 1).minus(1);

    if (type.includes("uint")) {
      max = new BigNumber(2).pow(bits).minus(1);
      return NumericStatement.getRandom(
        "uint",
        0,
        false,
        max,
        new BigNumber(0)
      );
    } else {
      return NumericStatement.getRandom("int", 0, true, max, max.negated());
    }
    if (type.includes("ufixed")) {
      return NumericStatement.getRandom(
        "ufixed",
        getProperty("numeric_decimals"),
        false
      );
    } else {
      return NumericStatement.getRandom(
        "fixed",
        getProperty("numeric_decimals"),
        true
      );
    }
  }

  sampleStatement(
    depth: number,
    type: string,
    geneType = "primitive"
  ): Statement {
    if (geneType === "primitive") {
      if (type === "bool") {
        return BoolStatement.getRandom();
      } else if (type === "address") {
        return AddressStatement.getRandom();
      } else if (type === "string") {
        return StringStatement.getRandom();
      } else if (type.includes("string")) {
        return StringStatement.getRandom();
      } else if (type.startsWith("byte")) {
        return this.sampleByteStatement(type);
      } else if (type == "") {
        throw new Error(
          `Type "" not recognized. It must be a bug in our parser!`
        );
      }
    } else if (geneType === "functionCall") {
      return this.sampleObjectFunctionCall(depth, type);
    } else if (geneType === "constructor") {
      return this.sampleConstructor(depth);
    }

    throw new Error(`Unknown type ${type} ${geneType}!`);
  }

  sampleByteStatement(type: string): ByteStatement {
    if (type === "byte" || type === "bytes1")
      return ByteStatement.getRandom("byte", 1);
    else if (type === "bytes") {
      return ByteStatement.getRandom("byte", prng.nextInt(1, 32));
    } else {
      const nBytes = type.replace("bytes", "");
      const n = Number.parseInt(nBytes);
      return ByteStatement.getRandom("byte", n);
    }
  }

  sampleObjectFunctionCall(depth: number, type: string): ObjectFunctionCall {
    const action = prng.pickOne(
      this._subject.getPossibleActions("function", type)
    );

    const args: Statement[] = [];

    for (const arg of action.args) {
      if (arg.type != "")
        args.push(this.sampleArgument(depth + 1, arg.type, arg.bits));
    }

    const constructor = this.sampleConstructor(depth + 1);

    return new ObjectFunctionCall(
      action.returnType,
      prng.uniqueId(),
      constructor,
      action.name,
      args
    );
  }
}
