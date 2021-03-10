import {
  BoolStatement,
  ConstructorCall,
  getProperty,
  NumericStatement,
  ObjectFunctionCall,
  prng,
  Statement,
  StringStatement,
  TestCase,
} from "syntest-framework";
import { SoliditySampler } from "./SoliditySampler";
import { SolidityTarget } from "../..";
import { AddressStatement } from "../../testcase/AddressStatement";

/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
export class SolidityRandomSampler extends SoliditySampler {
  /**
   * Constructor
   */
  constructor(target: SolidityTarget) {
    super(target);
  }

  sampleIndividual(): TestCase {
    const root = this.sampleConstructor(0);

    const call = this.sampleMethodCall(root);
    root.setChild(0, call);
    return new TestCase(root);
  }

  sampleMethodCall(root: ConstructorCall): ObjectFunctionCall {
    const action = prng.pickOne(this.target.getPossibleActions("function"));

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
    const constructors = this.target.getPossibleActions("constructor");
    if (constructors.length > 0) {
      const action = prng.pickOne(
        this.target.getPossibleActions("constructor")
      );
      // TODO arguments for constructors
      return new ConstructorCall(
        action.name,
        prng.uniqueId(),
        `${action.name}`,
        []
      );
    } else {
      // if no constructors is available, we invoke the default (implicit) constructor
      return new ConstructorCall(
        this.target.name,
        prng.uniqueId(),
        `${this.target.name}`,
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
        return this.sampleGene(depth, type);
      }
    }

    if (
      this.target.getPossibleActions().filter((a) => a.type === type).length &&
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
        return this.sampleGene(depth, type);
      }
    }
  }

  sampleNumericGene(depth: number, type: string, bits: number): Statement {
    const max = Math.pow(2, bits) - 1;
    if (type.includes("uint")) {
      return NumericStatement.getRandom("uint", 0, max, false);
    } else {
      return NumericStatement.getRandom("int", 0, max, true);
    }
    if (type.includes("ufixed")) {
      return NumericStatement.getRandom(
        "ufixed",
        getProperty("numeric_decimals"),
        max,
        false
      );
    } else {
      return NumericStatement.getRandom(
        "fixed",
        getProperty("numeric_decimals"),
        max,
        true
      );
    }
  }

  sampleGene(depth: number, type: string, geneType = "primitive"): Statement {
    if (geneType === "primitive") {
      if (type === "bool") {
        return BoolStatement.getRandom();
      } else if (type === "address") {
        return AddressStatement.getRandom();
      } else if (type === "string") {
        return StringStatement.getRandom();
      } else if (type.includes("string")) {
        return StringStatement.getRandom();
      } else if (type == "") {
        throw new Error(`Weird!`);
      }
    } else if (geneType === "functionCall") {
      return this.sampleObjectFunctionCall(depth, type);
    } else if (geneType === "constructor") {
      return this.sampleConstructor(depth);
    }

    throw new Error(`Unknown type ${type} ${geneType}!`);
  }

  sampleObjectFunctionCall(depth: number, type: string): ObjectFunctionCall {
    const action = prng.pickOne(
      this.target.getPossibleActions("function", type)
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
