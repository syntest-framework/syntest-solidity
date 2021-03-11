const UI = require("./ui");

/**
 * UI for solidity-coverage/src/app.js
 */
class AppUI extends UI {
  constructor(log) {
    super(log);
  }

  /**
   * Writes a formatted message via log
   * @param  {String}   kind  message selector
   * @param  {String[]} args  info to inject into template
   */
  report(kind, args = []) {
    const c = this.chalk;
    const ct = c.bold.green(">");
    const ds = c.bold.yellow(">");
    const w = ":warning:";

    const kinds = {
      "vm-fail":
        `${w}  ${c.red("There was a problem attaching to the ganache VM.")}\n` +
        `${w}  ${c.red(
          'For help, see the "client" & "providerOptions" syntax in solidity-coverage docs.'
        )}\n` +
        `${w}  ${c.red(`Using ganache-cli (v${args[0]}) instead.`)}\n`,

      "instr-start":
        `\n${c.bold("Instrumenting for coverage...")}` +
        `\n${c.bold("=============================")}\n`,

      "instr-item": `${ct} ${args[0]}`,

      istanbul:
        `${ct} ${c.grey("Istanbul reports written to")} ./coverage/ ` +
        `${c.grey("and")} ./coverage.json`,

      finish: `${ct} ${c.grey(
        "solidity-coverage cleaning up, shutting down ganache server"
      )}`,

      server: `${ct} ${c.bold("server: ")}           ${c.grey(args[0])}`,

      command:
        `\n${w}  ${c.red.bold(
          "solidity-coverage >= 0.7.0 is no longer a shell command."
        )} ${w}\n` +
        `${c.bold(
          "============================================================="
        )}\n\n` +
        `Instead, you should use the plugin produced for your development stack\n` +
        `(like Truffle, Buidler) or design a custom workflow using the package API\n\n` +
        `> See https://github.com/sc-forks/solidity-coverage for help with configuration.\n\n` +
        `${c.green.bold("Thanks! - sc-forks")}\n`,
    };

    this._write(kinds[kind]);
  }

  /**
   * Returns a formatted message. Useful for error message.
   * @param  {String}   kind  message selector
   * @param  {String[]} args  info to inject into template
   * @return {String}         message
   */
  generate(kind, args = []) {
    const c = this.chalk;

    const kinds = {
      "config-fail":
        `${c.red("A config option (.syntest.js) is incorrectly formatted: ")}` +
        `${c.red(args[0])}.`,

      "instr-fail":
        `${c.red("Could not instrument:")} ${args[0]}. ` +
        `${c.red(
          "(Please verify solc can compile this file without errors.) "
        )}`,

      "istanbul-fail": `${c.red(
        "Istanbul coverage reports could not be generated. "
      )}`,

      "sources-fail": `${c.red(
        "Cannot locate expected contract sources folder: "
      )} ${args[0]}`,

      "server-fail":
        `${c.red("Port")} ${args[0]} ${c.red("is already in use.\n")}` +
        `${c.red(
          '\tRun: "lsof -i" to find the pid of the process using it.\n'
        )}` +
        `${c.red('\tRun: "kill -9 <pid>" to kill it.\n')}`,
    };

    return this._format(kinds[kind]);
  }
}

module.exports = AppUI;