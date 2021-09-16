import * as path from "path";
import { mRequire } from "./memfs";

export function createCustomMocha(config) {
  // Allow people to specify config.mocha in their config.
  const mochaConfig = config.mocha || {};

  // Propagate --bail option to mocha
  mochaConfig.bail = config.bail;

  // If the command line overrides color usage, use that.
  if (config.color != null) {
    mochaConfig.color = config.color;
  } else if (config.colors != null) {
    // --colors is a mocha alias for --color
    mochaConfig.color = config.colors;
  }

  // Default to true if configuration isn't set anywhere.
  if (mochaConfig.color == null) {
    mochaConfig.color = true;
  }

  const Mocha = mochaConfig.package || require("mocha");
  delete mochaConfig.package;
  const mocha = new Mocha(mochaConfig);

  mocha.loadFiles = function loadFiles(callback) {
    const Suite = require("mocha/lib/suite");

    const suite = this.suite;
    const files = this.files;

    for (let file of files) {
      file = path.resolve(file);

      suite.emit(Suite.constants.EVENT_FILE_PRE_REQUIRE, global, file, this);
      suite.emit(
        Suite.constants.EVENT_FILE_REQUIRE,
        mRequire(file),
        file,
        this
      );
      suite.emit(Suite.constants.EVENT_FILE_POST_REQUIRE, global, file, this);
    }
    if (typeof callback === "function") {
      callback();
    }
  };

  return mocha;
}
