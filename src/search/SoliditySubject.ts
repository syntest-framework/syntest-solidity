import {
  ActionDescription,
  CFG,
  SearchSubject,
  Encoding,
  BranchObjectiveFunction,
  FunctionObjectiveFunction,
  ObjectiveFunction,
  getProperty,
} from "syntest-framework";
import { RequireObjectiveFunction } from "../criterion/RequireObjectiveFunction";

export class SoliditySubject<T extends Encoding> extends SearchSubject<T> {
  private _functionCalls: FunctionDescription[] | null = null;

  constructor(name: string, cfg: CFG, functionMap: any) {
    super(name, cfg, functionMap);
  }

  protected _extractObjectives(): void {
    // Branch objectives
    this._cfg.nodes
      // Find all branch nodes
      .filter((node) => node.branch)
      .forEach((branchNode) => {
        this._cfg.edges
          // Find all edges from the branch node
          .filter((edge) => edge.from === branchNode.id)
          .forEach((edge) => {
            this._cfg.nodes
              // Find nodes with incoming edge from branch node
              .filter((node) => node.id === edge.to)
              .forEach((childNode) => {
                // Add objective function
                this._objectives.set(
                  new BranchObjectiveFunction(
                    this,
                    childNode.id,
                    branchNode.lines[0],
                    edge.branchType
                  ),
                  []
                );
              });
          });
      });

    if (getProperty("probe_objective")) {
      // Probe objectives
      this._cfg.nodes
        // Find all probe nodes
        .filter((node) => node.probe)
        .forEach((probeNode) => {
          this._cfg.edges
            // Find all edges from the probe node
            .filter((edge) => edge.from === probeNode.id)
            .forEach((edge) => {
              this._cfg.nodes
                // Find nodes with incoming edge from probe node
                .filter((node) => node.id === edge.to)
                .forEach((childNode) => {
                  // Add objective
                  this._objectives.set(
                    new RequireObjectiveFunction(
                      this,
                      childNode.id,
                      probeNode.lines[0],
                      edge.branchType
                    ),
                    []
                  );
                });
            });
        });
    }

    // Add children for branches and probe objectives
    for (const objective of this._objectives.keys()) {
      if (
        objective instanceof RequireObjectiveFunction &&
        objective.type === false
      )
        continue;

      const childrenObj = this.findChildren(objective);
      this._objectives.get(objective).push(...childrenObj);
    }

    // Function objectives
    this._cfg.nodes
      // Find all root function nodes
      .filter((node) => node.root)
      .forEach((node) => {
        // Add objective
        const functionObjective = new FunctionObjectiveFunction(
          this,
          node.id,
          node.lines[0]
        );
        const childrenObj = this.findChildren(functionObjective);
        this._objectives.set(functionObjective, childrenObj);
      });
  }

  findChildren(obj: ObjectiveFunction<T>): ObjectiveFunction<T>[] {
    let childrenObj = [];

    let edges2Visit = this._cfg.edges.filter(
      (edge) => edge.from === obj.getIdentifier()
    );
    const visitedEdges = [];

    while (edges2Visit.length > 0) {
      const edge = edges2Visit.pop();

      if (visitedEdges.includes(edge))
        // this condition is made to avoid infinite loops
        continue;

      visitedEdges.push(edge);

      const found = this.getObjectives().filter(
        (child) => child.getIdentifier() === edge.to
      );
      if (found.length == 0) {
        const additionalEdges = this._cfg.edges.filter(
          (nextEdge) => nextEdge.from === edge.to
        );
        edges2Visit = edges2Visit.concat(additionalEdges);
      } else {
        childrenObj = childrenObj.concat(found);
      }
    }

    return childrenObj;
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
        (returnType === undefined || f.returnType === returnType) &&
        (f.visibility === "public" || f.visibility === "external") &&
        f.name !== "" // fallback function has no name
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

      let visibility = "public";
      if (fn.functionDefinition.includes(" private ")) visibility = "private";
      else if (fn.functionDefinition.includes(" internal "))
        visibility = "internal";
      else if (fn.functionDefinition.includes(" external "))
        visibility = "external";

      possibleTargets.push({
        name: name,
        type: type,
        visibility: visibility,
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
  visibility: string;
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
