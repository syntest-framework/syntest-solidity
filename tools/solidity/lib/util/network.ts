/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
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
import { getUserInterface } from "@syntest/search";
import * as TruffleProvider from "@truffle/provider";
import TruffleConfig = require("@truffle/config");

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
// eslint-disable-next-line
export function setNetwork(config: TruffleConfig, api: any): void {
  // --network <network-name>
  if (config.network) {
    const network = config.networks[config.network];

    // Check network:
    if (!network) {
      throw new Error("no-network " + [config.network]);
    }

    // Check network id
    if (isNaN(Number.parseInt(network.network_id))) {
      network.network_id = "*";
    } else {
      // Warn: non-matching provider options id and network id
      if (
        api.providerOptions.network_id &&
        api.providerOptions.network_id !== Number.parseInt(network.network_id)
      ) {
        getUserInterface().info(
          "id-clash " + [Number.parseInt(network.network_id)]
        );
      }

      // Prefer network defined id.
      api.providerOptions.network_id = Number.parseInt(network.network_id);
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
// eslint-disable-next-line
export function setOuterConfigKeys(
  config: TruffleConfig,
  // eslint-disable-next-line
  api: any,
  // eslint-disable-next-line
  id: any
): void {
  try {
    config.network_id = id;
    config.port = api.port;
    config.host = api.host;
    config.provider = TruffleProvider.create(config);
  } catch {
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
// eslint-disable-next-line
export function setNetworkFrom(config: TruffleConfig, accounts: any[]): void {
  if (!config.networks[config.network].from) {
    config.networks[config.network].from = accounts[0];
  }
}
