import { getUserInterface } from "@syntest/core";

const TruffleProvider = require("@truffle/provider");

/**
 * Configures the network. Runs before the server is launched.
 * User can request a network from truffle-config with "--network <name>".
 * There are overlapiing options in solcoverjs (like port and providerOptions.network_id).
 * Where there are mismatches user is warned & the truffle network settings are preferred.
 *
 * Also generates a default config & sets the default gas high / gas price low.
 *
 * @param {TruffleConfig}      config
 * @param {SolidityCoverage} api
 */
export function setNetwork(config: any, api: any): void {
  // --network <network-name>
  if (config.network) {
    const network = config.networks[config.network];

    // Check network:
    if (!network) {
      throw new Error("no-network " + [config.network]);
    }

    // Check network id
    if (!isNaN(parseInt(network.network_id))) {
      // Warn: non-matching provider options id and network id
      if (
        api.providerOptions.network_id &&
        api.providerOptions.network_id !== parseInt(network.network_id)
      ) {
        getUserInterface().info("id-clash " + [parseInt(network.network_id)]);
      }

      // Prefer network defined id.
      api.providerOptions.network_id = parseInt(network.network_id);
    } else {
      network.network_id = "*";
    }

    // Check port: use solcoverjs || default if undefined
    if (!network.port) {
      getUserInterface().info("no-port " + [api.port]);
      network.port = api.port;
    }

    // Warn: port conflicts
    if (api.port !== api.defaultPort && api.port !== network.port) {
      getUserInterface().info("port-clash " + [network.port]);
    }

    // Prefer network port if defined;
    api.port = network.port;

    network.gas = api.gasLimit;
    network.gasPrice = api.gasPrice;

    setOuterConfigKeys(config, api, network.network_id);
    return;
  }

  // Default Network Configuration
  config.network = "soliditycoverage";
  setOuterConfigKeys(config, api, "*");

  config.networks[config.network] = {
    network_id: "*",
    port: api.port,
    host: api.host,
    gas: api.gasLimit,
    gasPrice: api.gasPrice,
  };
}

// Truffle complains that these outer keys *are not* set when running plugin fn directly.
// But throws saying they *cannot* be manually set when running as truffle command.
export function setOuterConfigKeys(config: any, api: any, id: any): void {
  try {
    config.network_id = id;
    config.port = api.port;
    config.host = api.host;
    config.provider = TruffleProvider.create(config);
  } catch (err) {
    // return statement such that eslint doesn't complain
    return;
  }
}

/**
 * Sets the default `from` account field in the truffle network that will be used.
 * This needs to be done after accounts are fetched from the launched client.
 * @param {TruffleConfig} config
 * @param {Array}         accounts
 */
export function setNetworkFrom(config: any, accounts: any[]): void {
  if (!config.networks[config.network].from) {
    config.networks[config.network].from = accounts[0];
  }
}
