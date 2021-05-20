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
export declare function setNetwork(config: any, api: any): void;
export declare function setOuterConfigKeys(config: any, api: any, id: any): void;
/**
 * Sets the default `from` account field in the truffle network that will be used.
 * This needs to be done after accounts are fetched from the launched client.
 * @param {TruffleConfig} config
 * @param {Array}         accounts
 */
export declare function setNetworkFrom(config: any, accounts: any): void;
//# sourceMappingURL=network.d.ts.map