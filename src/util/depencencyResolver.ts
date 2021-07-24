import { TargetFile } from "syntest-framework";
import * as path from "path";

export function getDependencies(
  target: TargetFile
): [Map<string, string>, Map<string, string[]>] {
  const base = path.basename(target.relativePath);
  const fileName = base.split(".")[0];
  // TODO this assumes that the contract has the same name as the file (not sure if thats a problem maybe we done need the contract name at all)

  const importTexts = target.source.match(/import ["].*["];/g);

  const importsMap: Map<string, string> = new Map();
  const dependencies: string[] = [];

  importsMap.set(fileName, fileName); // TODO assumes contractName === filename

  if (importTexts && importTexts.length) {
    for (const _import of importTexts) {
      // TODO assumes " is used in imports
      let stripped = _import.split('"')[1];

      if (stripped.includes("/")) {
        stripped = path.basename(stripped);
      }

      if (stripped.includes(".")) {
        stripped = stripped.split(".")[0];
      }

      dependencies.push(stripped);
      importsMap.set(stripped, stripped); // TODO assumes contractName === filename
    }
  }

  // TODO assumes contractName === filename
  const dependencyMap: Map<string, string[]> = new Map();
  dependencyMap.set(fileName, dependencies);

  return [importsMap, dependencyMap];
}
