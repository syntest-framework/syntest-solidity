/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
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

export type Location = {
  id: string;
  start: {
    line: number;
    column: number;
    index: number;
  };
  end: {
    line: number;
    column: number;
    index: number;
  };
};

export type StatementMap = {
  [id: string]: Location;
};

export type BranchMap = {
  [id: string]: {
    line: number;
    type: string;
    loc: Location;
    locations: [Location, Location];
  };
};

export type FunctionMap = {
  [id: string]: {
    name: string;
    line: number;
    decl: Location;
    loc: Location;
  };
};

export type InstrumentationData = {
  source: string;
  instrumented: string;
  contractName: string;
  runnableLines: [];

  fnId: number;
  branchId: number;
  statementId: 0;
  injectionPoints: {
    [key: number]: { type: string }[];
  };

  fnMap: FunctionMap;
  branchMap: BranchMap;
  statementMap: StatementMap;

  s: {
    [id: string]: number;
  };
  f: {
    [id: string]: number;
  };
  b: {
    // 0 is true, 1 is false
    [id: string]: number[];
  };
};
// export type InstrumentationData = {
//   hash: string;
//   statementMap: StatementMap;
//   branchMap: BranchMap;
//   fnMap: FunctionMap;
//   s: {
//     [id: string]: number;
//   };
//   f: {
//     [id: string]: number;
//   };
//   b: {
//     // 0 is true, 1 is false
//     [id: string]: number[];
//   };
// };

export type InstrumentationDataMap = {
  [path: string]: InstrumentationData;
};
