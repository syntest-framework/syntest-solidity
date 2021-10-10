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

/**
 * Generic graph class.
 *
 * @author Mitchell Olsthoorn
 */
export class Graph<T> {
  protected _adjacencyMap: Map<T, Set<T>>;

  constructor() {
    this._adjacencyMap = new Map<T, Set<T>>();
  }

  addNode(node: T): void {
    if (!this._adjacencyMap.has(node))
      this._adjacencyMap.set(node, new Set<T>());
  }

  getNodes(): T[] {
    return Array.from(this._adjacencyMap.keys());
  }

  addEdge(source: T, destination: T): void {
    this.addNode(source);
    this.addNode(destination);
    this._adjacencyMap.get(source).add(destination);
  }

  getAdjacentNodes(node: T): T[] {
    return Array.from(this._adjacencyMap.get(node));
  }
}
