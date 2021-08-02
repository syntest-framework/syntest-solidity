import {CommandLineInterface, yargs} from 'syntest-framework'

import Messages from "./Messages";

const chalk = require("chalk");
const clear = require("clear");

export class SolidityCommandLineInterface extends CommandLineInterface {
    private messages: Messages;

    constructor(silent = false, verbose = false, messages: Messages) {
        super(silent, verbose);
        this.messages = messages
    }

    report(text: string, args = []): void {
        switch (text) {
            case 'clear':
                return clear()
            case 'asciiArt':
                return console.log(this.messages.asciiArt(args[0]))
            case 'network':
                return console.log(this.messages.network(args[0], args[1], args[2]))
            case 'help':
                return yargs
                    // .help("h")
                    // .alias("h", "help")
                    // .version("v")
                    // .alias("v", "version")
                    // .version()
                    .showHelp()
            case 'version':
                return console.log(this.messages.version(args[0]))
            case 'versions':
                return console.log(this.messages.versions(args[0], args[1], args[2]))
            case 'skip-files':
                if (!args.length) {
                    return
                }
                return console.log(this.messages.skipFiles(args))
            case 'test-target':
                return console.log(this.messages.testTarget(args[0]))
            case 'targets':
                return console.log(this.messages.targets(args))
            case 'seed':
                return console.log(this.messages.seed[args[0]])
            case 'algorithm':
                return console.log(this.messages.algorithm(args[0]))
            case 'property-set':
                return console.log(this.messages.propertySet(args[0], args[1]))
        }

        const c = chalk;
        const ct = c.bold.green(">");
        const w = ":warning:";
        const texts = {
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
        };

        if (!this.silent) {
            this.info(texts[text]);
        }
    }
}
