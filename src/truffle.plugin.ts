import { SolidityLauncher } from "./SolidityLauncher";

/**
 * Truffle Plugin: `truffle run coverage [options]`
 * @param  {Object}   config   @truffle/config config
 * @return {Promise}
 */
async function plugin(config) {
  const launcher = new SolidityLauncher();
  await launcher.run(config);
}

module.exports = plugin;
