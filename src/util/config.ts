/**
 * Maps truffle specific keys for the paths to things like sources to the generic
 * keys required by the plugin utils
 * @return {Object} truffle-config.js
 */
export function normalizeConfig(config) {
  config.workingDir = config.working_directory;
  config.contractsDir = config.contracts_directory;
  config.testDir = config.test_directory;
  config.artifactsDir = config.build_directory;

  // eth-gas-reporter freezes the in-process client because it uses sync calls
  if (
    typeof config.mocha === "object" &&
    config.mocha.reporter === "eth-gas-reporter"
  ) {
    config.mocha.reporter = "spec";
    delete config.mocha.reporterOptions;
  }

  // Truffle V4 style solc settings are honored over V5 settings. Apparently it's common
  // for both to be present in the same config (as an error).
  if (typeof config.solc === "object") {
    config.solc.optimizer = { enabled: false };
  }

  return config;
}
