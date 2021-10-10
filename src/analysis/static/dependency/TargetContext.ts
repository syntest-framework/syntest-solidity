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
 * Context containing all target metadata accessible within the context of a target.
 *
 * @author Mitchell Olsthoorn
 */
export class TargetContext<T> {
  // Mapping: target name -> target metadata
  protected _context: Map<string, T>;

  // Mapping: target name -> target path
  protected _location: Map<string, string>;

  // Mapping: target path -> target name
  protected _inverseLocation: Map<string, Set<string>>;

  /**
   * Constructor.
   */
  constructor() {
    this._context = new Map<string, T>();
    this._location = new Map<string, string>();
    this._inverseLocation = new Map<string, Set<string>>();
  }

  /**
   * Add target metadata to the context.
   *
   * @param targetPath The path to the target
   * @param targetName The name of the target
   * @param target The target metadata
   */
  add(targetPath: string, targetName: string, target: T) {
    this._context.set(targetName, target);
    this._location.set(targetName, targetPath);

    if (this._inverseLocation.has(targetPath)) {
      const targets = this._inverseLocation.get(targetPath);
      targets.add(targetName);
    } else {
      const targets = new Set<string>();
      targets.add(targetName);
      this._inverseLocation.set(targetPath, targets);
    }
  }

  /**
   * Return the target metadata.
   *
   * @param targetName The name of the target
   */
  getTarget(targetName: string): T {
    return this._context.get(targetName);
  }

  /**
   * Return the targets located in the provided file path.
   *
   * @param targetPath The path of the file to look in
   */
  getTargets(targetPath: string): T[] {
    const targetNames = Array.from(this._inverseLocation.get(targetPath));
    return targetNames.map((targetName) => {
      return this.getTarget(targetName);
    });
  }

  /**
   * Return the file path of the target.
   *
   * @param targetName The name of the target
   */
  getLocation(targetName: string): string {
    return this._location.get(targetName);
  }
}
