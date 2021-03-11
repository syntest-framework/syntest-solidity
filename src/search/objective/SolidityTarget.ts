import { ActionDescription, CFG, Target } from "syntest-framework";

export class SolidityTarget extends Target {
  private _functionCalls: FunctionDescription[] | null = null;

  constructor(name: string, cfg: CFG, functionMap: any) {
    super(name, cfg, functionMap);
  }

  get functionCalls(): FunctionDescription[] {
    if (this._functionCalls === null) {
      this._functionCalls = this.getPossibleActions();
    }

    return this._functionCalls;
  }

  set functionCalls(value: FunctionDescription[]) {
    this._functionCalls = value;
  }

  getPossibleActions(
    type?: string,
    returnType?: string
  ): FunctionDescription[] {
    if (this._functionCalls == null) {
      this.parseActions();
    }

    return this._functionCalls!.filter((f) => {
      return (
        (type === undefined || f.type === type) &&
        (returnType === undefined || f.returnType === returnType)
      );
    });
  }

  parseActions(): void {
    const possibleTargets: FunctionDescription[] = [];

    const fnMap = this.functionMap;
    for (const key of Object.keys(fnMap)) {
      const fn = fnMap[key];

      const args = fn.functionDefinition
        .slice(
          fn.functionDefinition.indexOf("(") + 1,
          fn.functionDefinition.indexOf(")")
        )
        .split(",");
      const returnValue = fn.functionDefinition
        .slice(
          fn.functionDefinition.lastIndexOf("(") + 1,
          fn.functionDefinition.lastIndexOf(")")
        )
        .split(" ");

      let type = "function";
      let name = fn.name;

      if (fn.name === "constructor") {
        type = "constructor";
        name = this.name;
      }

      const returnType = returnValue[0];
      const argumentDescriptions = args.map((a: any) => {
        const split = a.trim().split(" ");
        const typeName = split[0];

        const arg: ArgumentDescription = {
          type: typeName,
          bits: 0,
          decimals: 0,
        };

        if (typeName.includes("int")) {
          const type = typeName.includes("uint") ? "uint" : "int";
          const bits = typeName.replace(type, "");
          arg.type = type;
          if (bits && bits.length) {
            arg.bits = parseInt(bits);
          } else {
            arg.bits = 256;
          }
        } else if (typeName.includes("fixed")) {
          const type = typeName.includes("ufixed") ? "ufixed" : "fixed";
          let params = typeName.replace(type, "");
          params = params.split("x");
          arg.type = type;
          arg.bits = parseInt(params[0]) || 128;
          arg.decimals = parseInt(params[1]) || 18;
        }

        return arg;
      });

      possibleTargets.push({
        name: name,
        type: type,
        returnType: returnType,
        args: argumentDescriptions,
      });
    }

    this._functionCalls = possibleTargets;
  }
}

export interface FunctionDescription extends ActionDescription {
  name: string;
  type: string;
  returnType: string;
  args: ArgumentDescription[];
}

export interface ConstructorDescription extends FunctionDescription {
  name: string;
  type: string;
  args: ArgumentDescription[];
}

export interface ArgumentDescription {
  type: string;
  bits?: number;
  decimals?: number;
}