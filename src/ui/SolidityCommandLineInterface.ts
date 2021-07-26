import { CommandLineInterface } from "syntest-framework";
import { getLogger } from "syntest-framework";
const chalk = require("chalk");

export class SolidityCommandLineInterface extends CommandLineInterface {
  constructor(silent = false, verbose = false) {
    super(silent, verbose);
  }

  report(text: string, args = []) {
    const c = chalk;
    const ct = c.bold.green(">");
    const ds = c.bold.yellow(">");
    const w = ":warning:";
    const texts = {
      "instr-skip":
        `\n${c.bold("Coverage skipped for:")}` +
        `\n${c.bold("=====================")}\n`,
      "instr-skipped": `${ds} ${c.grey(args[0])}`,
      "sol-tests":
        `${w}  ${c.red(
          "This plugin cannot run Truffle's native solidity tests: "
        )}` + `${args[0]} test(s) will be skipped.\n`,
      "id-clash":
        `${w}  ${c.red("The 'network_id' values in your truffle network ")}` +
        `${c.red("and .syntest.js are different. Using truffle's: ")} ${c.bold(
          args[0]
        )}.\n`,
      "port-clash":
        `${w}  ${c.red("The 'port' values in your truffle network ")}` +
        `${c.red("and .syntest.js are different. Using truffle's: ")} ${c.bold(
          args[0]
        )}.\n`,
      "no-port":
        `${w}  ${c.red("No 'port' was declared in your truffle network. ")}` +
        `${c.red("Using solidity-coverage's: ")} ${c.bold(args[0])}.\n`,
      "lib-local": `\n${ct} ${c.grey(
        "Using Truffle library from local node_modules."
      )}\n`,
      "lib-global": `\n${ct} ${c.grey(
        "Using Truffle library from global node_modules."
      )}\n`,
      "lib-warn":
        `${w}  ${c.red(
          "Unable to require Truffle library locally or globally.\n"
        )}` +
        `${w}  ${c.red(
          "Using fallback Truffle library module instead (v5.0.31)"
        )}\n` +
        `${w}  ${c.red(
          "Truffle V5 must be a local dependency for fallback to work."
        )}\n`,
      help:
        `Usage: truffle run coverage [options]\n\n` +
        `Options:\n` +
        `  --file:       path (or glob) to subset of JS test files. (Quote your globs)\n` +
        `  --syntestjs: relative path to .syntest.js (ex: ./../.syntest.js)\n` +
        `  --version:    version info\n`,
      versions:
        `${ct} ${c.bold("truffle")}:           v${args[0]}\n` +
        `${ct} ${c.bold("ganache-core")}:      ${args[1]}\n` +
        `${ct} ${c.bold("solidity-coverage")}: v${args[2]}`,
      network:
        `\n${c.bold("Network Info")}` +
        `\n${c.bold("============")}\n` +
        `${ct} ${c.bold("id")}:      ${args[1]}\n` +
        `${ct} ${c.bold("port")}:    ${args[2]}\n` +
        `${ct} ${c.bold("network")}: ${args[0]}\n`,
    };

    if (!this.silent) {
      getLogger().info(texts[text]);
    }
  }
}
