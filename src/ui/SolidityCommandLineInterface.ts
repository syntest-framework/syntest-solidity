import { CommandLineInterface, yargs } from "@syntest/framework";

import Messages from "./Messages";

const clear = require("clear");

/**
 * A solidity specific command line interface.
 * @author Dimitri
 */
export class SolidityCommandLineInterface extends CommandLineInterface {
  private messages: Messages;

  constructor(silent = false, verbose = false, messages: Messages) {
    super(silent, verbose);
    this.messages = messages;
  }

  report(text: string, args = []): void {
    switch (text) {
      case "clear":
        return clear();
      case "asciiArt":
        return console.log(this.messages.asciiArt(args[0]));
      case "help":
        return yargs.showHelp();
      case "version":
        return console.log(this.messages.version(args[0]));
      case "versions":
        return console.log(this.messages.versions(args[0], args[1], args[2]));
      case "skip-files":
        if (!args.length) {
          return;
        }
        return console.log(this.messages.skipFiles(args));
      case "targets":
        return console.log(this.messages.targets(args));
      case "single-property":
        return console.log(this.messages.singleProperty(args[0], args[1]));
      case "property-set":
        return console.log(this.messages.propertySet(args[0], args[1]));
      case "header":
        return console.log(this.messages.header(args[0]));
    }

    throw new Error(`Message not supported by UI: "${text}"`);
  }
}
