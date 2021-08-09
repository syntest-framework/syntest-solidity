import { MonitorCommandLineInterface, yargs } from "syntest-framework";
import Messages from "./Messages";

const clear = require("clear");

export class SolidityMonitorCommandLineInterface extends MonitorCommandLineInterface {
  private messages: Messages;

  constructor(silent = false, verbose = false, messages: Messages) {
    super(silent, verbose);
    this.messages = messages;
  }

  report(text: string, args = []): void {
    switch (text) {
      case "clear":
        // return clear()
        return;
      case "asciiArt":
        return;
      case "help":
        clear();
        return (
          yargs
            // .help("h")
            // .alias("h", "help")
            // .version("v")
            // .alias("v", "version")
            // .version()
            .showHelp()
        );
      case "version":
        this.logs.push(this.messages.versions(args[0], args[1], args[2]));
        return;
      case "skip-files":
        if (!args.length) {
          return;
        }
        this.logs.push(this.messages.skipFiles(args));
        return;
      case "targets":
        if (!args.length) {
          return;
        }
        this.logs.push(this.messages.targets(args));
        return;
      case "single-property":
        this.logs.push(this.messages.singleProperty(args[0], args[1]));
        return;
      case "property-set":
        this.logs.push(this.messages.propertySet(args[0], args[1]));
        return;
      case "header":
        this.logs.push(this.messages.header(args[0]));
        return;
    }

    while (this.logs.length > 15) {
      this.logs.shift();
    }
    throw new Error(`Message not supported by UI: "${text}"`);
  }
}
