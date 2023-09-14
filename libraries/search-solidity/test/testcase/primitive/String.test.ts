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
import * as chai from "chai";

import { StringStatement } from "../../../lib/testcase/statements/primitive/StringStatement";
import { SolidityRandomSampler } from "../../../lib/testcase/sampling/SolidityRandomSampler";

const expect = chai.expect;

const mockSampler = new SolidityRandomSampler(undefined, undefined, false, 0, false, 0, 0, "abcdef", 10, 0.5, true)

describe("StringStatement", () => {
  it("Add mutation increases statement's length by one", () => {
    const statement = StringStatement.getRandom();
    const mutated = statement.addMutation(mockSampler);

    expect(statement.value.length + 1 === mutated.value.length);
  });

  it("Remove mutation decreases statement's length by one", () => {
    const statement = StringStatement.getRandom();
    const mutated = statement.removeMutation(mockSampler);

    expect(statement.value.length - 1 === mutated.value.length);
  });

  it("Replace mutation doesnt affect statement's length", () => {
    const statement = StringStatement.getRandom();
    const mutated = statement.replaceMutation(mockSampler);

    expect(statement.value.length === mutated.value.length);
  });

  it("Delta mutation doesnt affect statement's length", () => {
    const statement = StringStatement.getRandom();
    const mutated = statement.deltaMutation(mockSampler);

    expect(statement.value.length - 1 === mutated.value.length);
  });

  it("Copy gives exact same value", () => {
    const statement = StringStatement.getRandom();
    const copy = statement.copy();

    expect(statement.value).to.equal(copy.value);
  });

  it("Mutate gives exact other value", () => {
    const statement = StringStatement.getRandom();
    const mutation = statement.mutate(mockSampler);

    expect(statement.value != mutation.value);
  });
});
