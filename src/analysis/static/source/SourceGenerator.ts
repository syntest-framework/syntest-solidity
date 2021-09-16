import * as fs from "fs";

/**
 * Generator for target sources.
 *
 * @author Mitchell Olsthoorn
 */
export class SourceGenerator {
  /**
   * Retrieve the source for the provided path.
   *
   * @param targetPath The path to the source to generate
   */
  generate(targetPath: string): string {
    return fs.readFileSync(targetPath).toString("utf-8");
  }
}
