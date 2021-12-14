/*
 * Copyright 2020-2021 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Solidity.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  BranchNode,
  BranchObjectiveFunction,
  CFG,
  Encoding,
  FunctionDescription,
  FunctionObjectiveFunction,
  NodeType,
  ObjectiveFunction,
  Parameter,
  PublicVisibility,
  SearchSubject,
} from "@syntest/framework";

import { RequireObjectiveFunction } from "../criterion/RequireObjectiveFunction";
import { ExternalVisibility } from "../analysis/static/map/ContractFunction";
import {SolidityTestCase} from "../testcase/SolidityTestCase";

export class SoliditySubject extends SearchSubject<SolidityTestCase> {
  private _functionCalls: FunctionDescription[] | null = null;

  constructor(
    path: string,
    name: string,
    cfg: CFG,
    functionMap: FunctionDescription[]
  ) {
    super(path, name, cfg, functionMap);
  }

  protected _extractObjectives(): void {
    // Branch objectives
    this._cfg.nodes
      // Find all branch nodes
      .filter(
        (node) => node.type === NodeType.Branch && !(<BranchNode>node).probe
      )
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

    // Probe objectives
    this._cfg.nodes
      // Find all probe nodes
      .filter(
        (node) => node.type === NodeType.Branch && (<BranchNode>node).probe
      )
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
      .filter((node) => node.type === NodeType.Root)
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

  findChildren(obj: ObjectiveFunction<SolidityTestCase>): ObjectiveFunction<SolidityTestCase>[] {
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
    returnTypes?: Parameter[]
  ): FunctionDescription[] {
    if (this._functionCalls == null) {
      this.parseActions();
    }

    return this._functionCalls!.filter((f) => {
      // TODO
      // Currently we require the return parameters to be exactly equal.
      // However, if the required returnTypes are a superset of the return parameters of the function then it should also work!
      if (returnTypes) {
        if (returnTypes.length !== f.returnParameters.length) {
          return false;
        }

        for (let i = 0; i < returnTypes.length; i++) {
          if (returnTypes[i].type !== f.returnParameters[i].type) {
            return false;
          }
        }
      }

      return (
        (type === undefined || f.type === type) &&
        (f.visibility === PublicVisibility ||
          f.visibility === ExternalVisibility) &&
        f.name !== "" // fallback function has no name
      );
    });
  }

  parseActions(): void {
    this._functionCalls = this.functions.map((actionDescription) => {
      (<FunctionDescription>actionDescription).parameters = (<
        FunctionDescription
      >actionDescription).parameters.map((param): SolidityParameter => {
        const newParam = {
          name: param.name,
          type: param.type,
          bits: null,
          decimals: null,
        };

        if (param.type.includes("int")) {
          const type = param.type.includes("uint") ? "uint" : "int";
          const bits = param.type.replace(type, "");
          newParam.type = type;
          if (bits && bits.length) {
            newParam.bits = parseInt(bits);
          } else {
            newParam.bits = 256;
          }
        } else if (param.type.includes("fixed")) {
          const type = param.type.includes("ufixed") ? "ufixed" : "fixed";
          let params = [param.type.replace(type, "")];
          params = params[0].split("x");
          newParam.type = type;
          newParam.bits = parseInt(params[0]) || 128;
          newParam.decimals = parseInt(params[1]) || 18;
        }

        return newParam;
      });
      return <FunctionDescription>actionDescription;
    });
  }
}

export interface SolidityParameter extends Parameter {
  name: string;
  type: string;
  bits?: number;
  decimals?: number;
}
