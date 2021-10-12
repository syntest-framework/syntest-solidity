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

import * as path from "path";
import {
  Archive,
  EvaluationBudget,
  ExceptionObjectiveFunction,
  ExecutionResult,
  getSeed,
  IterationBudget,
  Properties,
  RuntimeVariable,
  SearchTimeBudget,
  StatisticsCollector,
  TotalTimeBudget,
} from "@syntest/framework";
import { SoliditySubject } from "../search/SoliditySubject";

export function collectInitialVariables(
  collector: StatisticsCollector<any>,
  currentSubject: SoliditySubject<any>,
  targetPath: string
) {
  collector.recordVariable(RuntimeVariable.VERSION, 1);
  collector.recordVariable(
    RuntimeVariable.CONFIGURATION,
    Properties.configuration
  );
  collector.recordVariable(RuntimeVariable.SEED, getSeed());
  collector.recordVariable(RuntimeVariable.SUBJECT, path.basename(targetPath));
  collector.recordVariable(
    RuntimeVariable.PROBE_ENABLED,
    Properties.probe_objective
  );
  collector.recordVariable(
    RuntimeVariable.CONSTANT_POOL_ENABLED,
    Properties.constant_pool
  );
  collector.recordVariable(RuntimeVariable.ALGORITHM, Properties.algorithm);
  collector.recordVariable(
    RuntimeVariable.TOTAL_OBJECTIVES,
    currentSubject.getObjectives().length
  );
}

export function collectStatistics(
  collector: StatisticsCollector<any>,
  currentSubject: SoliditySubject<any>,
  archive: Archive<any>,
  totalTimeBudget: TotalTimeBudget<any>,
  searchBudget: SearchTimeBudget<any>,
  iterationBudget: IterationBudget<any>,
  evaluationBudget: EvaluationBudget<any>
) {
  collector.recordVariable(
    RuntimeVariable.COVERED_OBJECTIVES,
    archive.getObjectives().length
  );
  collector.recordVariable(
    RuntimeVariable.INITIALIZATION_TIME,
    totalTimeBudget.getUsedBudget() - searchBudget.getUsedBudget()
  );
  collector.recordVariable(
    RuntimeVariable.SEARCH_TIME,
    searchBudget.getUsedBudget()
  );
  collector.recordVariable(
    RuntimeVariable.TOTAL_TIME,
    totalTimeBudget.getUsedBudget()
  );
  collector.recordVariable(
    RuntimeVariable.ITERATIONS,
    iterationBudget.getUsedBudget()
  );
  collector.recordVariable(
    RuntimeVariable.EVALUATIONS,
    evaluationBudget.getUsedBudget()
  );

  const numOfExceptions = archive
    .getObjectives()
    .filter(
      (objective) => objective instanceof ExceptionObjectiveFunction
    ).length;

  collector.recordVariable(RuntimeVariable.COVERED_EXCEPTIONS, numOfExceptions);

  collector.recordVariable(
    RuntimeVariable.COVERAGE,
    (archive.getObjectives().length - numOfExceptions) /
      currentSubject.getObjectives().length
  );
}

export function collectCoverageData(
  collector: StatisticsCollector<any>,
  archive: Archive<any>,
  objectiveType: string
): void {
  const total = new Set();
  const covered = new Set();

  for (const key of archive.getObjectives()) {
    const test = archive.getEncoding(key);
    const result: ExecutionResult = test.getExecutionResult();
    const contractName = key.getSubject().name.concat(".sol");

    result
      .getTraces()
      .filter((element) => element.type.includes(objectiveType))
      .filter((element) => {
        const paths = (element as any).contractPath.split("/");
        return paths[paths.length - 1].includes(contractName);
      })
      .forEach((current) => {
        total.add(
          current.type + "_" + current.line + "_" + current.locationIdx
        );

        if (current.hits > 0)
          covered.add(
            current.type + "_" + current.line + "_" + current.locationIdx
          );
      });
  }

  switch (objectiveType) {
    case "branch":
      {
        collector.recordVariable(
          RuntimeVariable.COVERED_BRANCHES,
          covered.size
        );
        collector.recordVariable(RuntimeVariable.TOTAL_BRANCHES, total.size);

        if (total.size > 0.0) {
          collector.recordVariable(
            RuntimeVariable.BRANCH_COVERAGE,
            covered.size / total.size
          );
        } else {
          collector.recordVariable(RuntimeVariable.BRANCH_COVERAGE, 0);
        }
      }
      break;
    case "statement":
      {
        collector.recordVariable(RuntimeVariable.COVERED_LINES, covered.size);
        collector.recordVariable(RuntimeVariable.TOTAL_LINES, total.size);

        if (total.size > 0.0) {
          collector.recordVariable(
            RuntimeVariable.LINE_COVERAGE,
            covered.size / total.size
          );
        } else {
          collector.recordVariable(RuntimeVariable.LINE_COVERAGE, 0);
        }
      }
      break;
    case "function":
      {
        collector.recordVariable(
          RuntimeVariable.COVERED_FUNCTIONS,
          covered.size
        );
        collector.recordVariable(RuntimeVariable.TOTAL_FUNCTIONS, total.size);

        if (total.size > 0.0) {
          collector.recordVariable(
            RuntimeVariable.FUNCTION_COVERAGE,
            covered.size / total.size
          );
        } else {
          collector.recordVariable(RuntimeVariable.FUNCTION_COVERAGE, 0);
        }
      }
      break;
    case "probe":
      {
        collector.recordVariable(RuntimeVariable.COVERED_PROBES, covered.size);
        collector.recordVariable(RuntimeVariable.TOTAL_PROBES, total.size);

        if (total.size > 0.0) {
          collector.recordVariable(
            RuntimeVariable.PROBE_COVERAGE,
            covered.size / total.size
          );
        } else {
          collector.recordVariable(RuntimeVariable.PROBE_COVERAGE, 0);
        }
      }
      break;
  }
}

export function collectProbeCoverageData(
  collector: StatisticsCollector<any>,
  archive: Archive<any>
): void {
  let total = 0;
  const covered = new Set();

  for (const key of archive.getObjectives()) {
    const test = archive.getEncoding(key);
    const result: ExecutionResult = test.getExecutionResult();
    const contractName = key.getSubject().name.concat(".sol");

    // filter by contract
    const traces = result.getTraces().filter((element) => {
      const paths = (element as any).contractPath.split("/");
      return paths[paths.length - 1].includes(contractName);
    });

    const preTraces = traces.filter(
      (element) => element.type.includes("probePre") && element.hits > 0
    );
    const postTraces = traces.filter((element) =>
      element.type.includes("probePost")
    );

    total = postTraces.length * 2;

    preTraces.forEach((trace) => {
      postTraces
        .filter((postTrace) => postTrace.line == trace.line)
        .forEach((postTrace) => {
          if (postTrace.hits > 0) covered.add(postTrace.line + "_true");
          else covered.add(postTrace.line + "_false");
        });
    });
  }

  collector.recordVariable(RuntimeVariable.COVERED_PROBES, covered.size);
  collector.recordVariable(RuntimeVariable.TOTAL_PROBES, total);

  if (total > 0.0) {
    collector.recordVariable(
      RuntimeVariable.PROBE_COVERAGE,
      covered.size / total
    );
  } else {
    collector.recordVariable(RuntimeVariable.PROBE_COVERAGE, 0);
  }
}
