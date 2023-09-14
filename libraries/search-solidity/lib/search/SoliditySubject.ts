/*
 * Copyright 2020-2022 Delft University of Technology and SynTest contributors
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
  ApproachLevel,
  BranchObjectiveFunction,
  FunctionObjectiveFunction,
  ObjectiveFunction,
  SearchSubject,
  shouldNeverHappen,
} from "@syntest/search";

import { SolidityTestCase } from "../testcase/SolidityTestCase";
import { ControlFlowGraph, Edge, EdgeType } from "@syntest/cfg";
import { RootContext, SubTarget, Target, Visibility } from "@syntest/analysis-solidity";
import { TargetType } from "@syntest/analysis";
import { BranchDistance } from "../criterion/BranchDistance";

export class SoliditySubject extends SearchSubject<SolidityTestCase> {
  protected syntaxForgiving: boolean;
  protected stringAlphabet: string;
  constructor(
    target: Target,
    rootContext: RootContext,
    syntaxForgiving: boolean,
    stringAlphabet: string
  ) {
    super(target, rootContext);
    this.syntaxForgiving = syntaxForgiving;
    this.stringAlphabet = stringAlphabet;

    this._extractObjectives();
  }

  protected _extractObjectives(): void {
    this._objectives = new Map<
      ObjectiveFunction<SolidityTestCase>,
      ObjectiveFunction<SolidityTestCase>[]
    >();

    const functions = this._rootContext.getControlFlowProgram(
      this._target.path
    ).functions;

    // FUNCTION objectives
    for (const function_ of functions) {
      const graph = function_.graph;
      // Branch objectives
      // Find all control nodes
      // I.E. nodes that have more than one outgoing edge
      const controlNodeIds = [...graph.nodes.keys()].filter(
        (node) => graph.getOutgoingEdges(node).length > 1
      );

      for (const controlNodeId of controlNodeIds) {
        const outGoingEdges = graph.getOutgoingEdges(controlNodeId);

        for (const edge of outGoingEdges) {
          if (["ENTRY", "SUCCESS_EXIT", "ERROR_EXIT"].includes(edge.target)) {
            throw new Error(
              `Function ${function_.name} in ${function_.id} ends in entry/exit node`
            );
          }
          // Add objective function
          this._objectives.set(
            new BranchObjectiveFunction(
              new ApproachLevel(),
              new BranchDistance(this.syntaxForgiving, this.stringAlphabet),
              this,
              edge.target
            ),
            []
          );
        }
      }

      for (const objective of this._objectives.keys()) {
        const childrenObject = this.findChildren(graph, objective);
        this._objectives.get(objective).push(...childrenObject);
      }

      const entry = function_.graph.entry;

      const children = function_.graph.getChildren(entry.id);

      if (children.length !== 1) {
        throw new Error(shouldNeverHappen("JavaScriptSubject")); //, "entry node has more than one child"))
      }

      // Add objective
      const functionObjective = new FunctionObjectiveFunction(
        this,
        function_.id
      );

      // find first control node in function
      let firstControlNodeInFunction = children[0];
      while (
        function_.graph.getChildren(firstControlNodeInFunction.id).length === 1
      ) {
        firstControlNodeInFunction = function_.graph.getChildren(
          firstControlNodeInFunction.id
        )[0];
      }

      // there are control nodes in the function
      if (
        function_.graph.getChildren(firstControlNodeInFunction.id).length === 2
      ) {
        const firstObjectives = function_.graph
          .getChildren(firstControlNodeInFunction.id)
          .map((child) => {
            return [...this._objectives.keys()].find(
              (objective) => objective.getIdentifier() === child.id
            );
          });

        if (!firstObjectives[0] || !firstObjectives[1]) {
          throw new Error(
            `Cannot find objective with id: ${firstControlNodeInFunction.id}`
          );
        }

        this._objectives.set(functionObjective, [...firstObjectives]);
      } else {
        // no control nodes so no sub objectives
        this._objectives.set(functionObjective, []);
      }
    }

    // Probe objectives
    // for (const probeNode of this._cfg.nodes
    //   // Find all probe nodes
    //   .filter(
    //     (node) => node.type === NodeType.Branch && (<BranchNode>node).probe
    //   )) {
    //     for (const edge of this._cfg.edges
    //       // Find all edges from the probe node
    //       .filter((edge) => edge.from === probeNode.id)) {
    //         for (const childNode of this._cfg.nodes
    //           // Find nodes with incoming edge from probe node
    //           .filter((node) => node.id === edge.to)) {
    //             // Add objective
    //             this._objectives.set(
    //               new RequireObjectiveFunction(
    //                 this,
    //                 childNode.id,
    //                 probeNode.lines[0],
    //                 edge.branchType
    //               ),
    //               []
    //             );
    //           }
    //       }
    //   }

    // // Add children for branches and probe objectives
    // for (const objective of this._objectives.keys()) {
    //   if (
    //     objective instanceof RequireObjectiveFunction &&
    //     objective.type === false
    //   )
    //     continue;

    //   const childrenObject = this.findChildren(graph, objective);
    //   this._objectives.get(objective).push(...childrenObject);
    // }

    // // Function objectives
    // for (const node of this._cfg.nodes
    //   // Find all root function nodes
    //   .filter((node) => node.type === NodeType.Root)) {
    //     // Add objective
    //     const functionObjective = new FunctionObjectiveFunction(
    //       this,
    //       node.id,
    //       node.lines[0]
    //     );
    //     const childrenObject = this.findChildren(functionObjective);
    //     this._objectives.set(functionObjective, childrenObject);
    //   }
  }

  findChildren(
    graph: ControlFlowGraph,
    object: ObjectiveFunction<SolidityTestCase>
  ): ObjectiveFunction<SolidityTestCase>[] {
    let childObjectives: ObjectiveFunction<SolidityTestCase>[] = [];

    let edges2Visit = [...graph.getOutgoingEdges(object.getIdentifier())]

    const visitedEdges: Edge[] = [];

    while (edges2Visit.length > 0) {
      const edge = edges2Visit.pop();

      if (visitedEdges.includes(edge)) {
        // this condition is made to avoid infinite loops
        continue;
      }
        
      if (edge.type === EdgeType.BACK_EDGE) {
        continue;
      }

      visitedEdges.push(edge);

      const found = this.getObjectives().filter(
        (child) => child.getIdentifier() === edge.target
      );
      if (found.length === 0) {
        const additionalEdges = graph.getOutgoingEdges(edge.target);

        edges2Visit = [...edges2Visit, ...additionalEdges];
      } else {
        childObjectives = [...childObjectives, ...found];
      }
    }

    return childObjectives;
  }

  getActionableTargets(): SubTarget[] {
    return (<SubTarget[]>(this._target.subTargets)).filter((t) => {
      return (
        (t.type === TargetType.FUNCTION && (t.visibility === Visibility.External || t.visibility === Visibility.Public)) 
        || t.type === TargetType.CLASS
      );
    });
  }

  getActionableTargetsByType(type: TargetType): SubTarget[] {
    return (<SubTarget[]>(this._target.subTargets)).filter((t) => {

      if (type === TargetType.FUNCTION) {
        return t.type === TargetType.FUNCTION && (t.visibility === Visibility.External || t.visibility === Visibility.Public)
      } else if (type === TargetType.CLASS) {
        return t.type === TargetType.CLASS
      } else {
        throw new Error(`Invalid target type: ${type}`)
      }
    });
  }
}