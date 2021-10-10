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

import { MonitorCommandLineInterface, yargs } from "syntest-framework";
import Messages from "./Messages";

const clear = require("clear");

/**
 * A solidity specific monitor command line interface.
 * @author Dimitri
 */
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
        return yargs.showHelp();
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
