const pify = require("pify");
const fs = require("fs");
const path = require("path");
const istanbul = require("sc-istanbul");
const assert = require("assert");
const detect = require("detect-port");
const _ = require("lodash/lang");

const ConfigValidator = require("./instrumentation/validator");
const Instrumenter = require("./instrumentation/instrumenter");
const Coverage = require("./instrumentation/coverage");
const DataCollector = require("./instrumentation/collector");
const AppUI = require("./instrumentation/app-ui");

/**
 * Coverage Runner
 */
export class Api {
  private _coverage: any;
  private _instrumenter: any;
  private _validator: any;
  private _config: any;
  
  private _testsErrored: boolean;
  private _cwd: string;

  private _defaultHook: () => void;
  private _onServerReady: (config: any) => void;
  private _onTestsComplete: (config: any) => void;
  private _onCompileComplete: (config: any) => void;
  private _onIstanbulComplete: (config: any) => void;
  
  private _server: any;
  private _defaultPort: number;
  private _client: any;
  private _defaultNetworkName: string;
  private _port: any;
  private _host: string;
  private _providerOptions: any;
  private _autoLaunchServer: boolean;
  
  private _skipFiles: any;
  private _log: any;
  
  private _gasLimit: number;
  private _gasLimitString: string;
  private _gasPrice: number;
  
  private _istanbulFolder: any;
  private _istanbulReporter: any;
  private _ui: any;

  private _collector: any;
  
  constructor(config: any = {}) {
    this._coverage = new Coverage();
    this._instrumenter = new Instrumenter();
    this._validator = new ConfigValidator();
    this._config = config || {};

    // Validate
    this._validator.validate(this._config);

    // Options
    this._testsErrored = false;

    this._cwd = config._cwd || process.cwd();

    this._defaultHook = () => {};
    this._onServerReady = config._onServerReady || this._defaultHook;
    this._onTestsComplete = config._onTestsComplete || this._defaultHook;
    this._onCompileComplete = config._onCompileComplete || this._defaultHook;
    this._onIstanbulComplete = config._onIstanbulComplete || this._defaultHook;

    this._server = null;
    this._defaultPort = 8555;
    this._client = config._client;
    this._defaultNetworkName = "soliditycoverage";
    this._port = config._port || this._defaultPort;
    this._host = config._host || "127.0.0.1";
    this._providerOptions = config._providerOptions || {};
    this._autoLaunchServer = config._autoLaunchServer === false ? false : true;

    this._skipFiles = config._skipFiles || [];

    this._log = config._log || console.log;

    this._gasLimit = 0xffffffffff; // default "gas sent" with transactions
    this._gasLimitString = "0xfffffffffff"; // block gas limit for ganache (higher than "gas sent")
    this._gasPrice = 0x01;

    this._istanbulFolder = config._istanbulFolder || false;
    this._istanbulReporter = config._istanbulReporter || [
      "html",
      "lcov",
      "text",
      "json",
    ];

    this.setLoggingLevel(config.silent);
    this._ui = new AppUI(this._log);
  }

  /**
   * Instruments a set of sources to prepare them for running under coverage
   * @param  {Object[]}  targets (see below)
   * @return {Object[]}          (see below)
   * @example of input/output array:
   * [{
   *   source:         (required) <solidity-source>,
   *   canonicalPath:  (required) <absolute path to source file>
   *   relativePath:   (optional) <rel path to source file for logging>
   * }]
   */
  instrument(targets = []) {
    let currentFile; // Keep track of filename in case we crash...
    let started = false;
    let outputs = [];

    try {
      for (let target of targets) {
        currentFile = target.relativePath || target.canonicalPath;

        if (!started) {
          started = true;
          this._ui.report("instr-start");
        }

        this._ui.report("instr-item", [currentFile]);

        const instrumented = this._instrumenter.instrument(
          target.source,
          target.canonicalPath
        );

        this._coverage.addContract(instrumented, target.canonicalPath);

        outputs.push({
          canonicalPath: target.canonicalPath,
          relativePath: target.relativePath,
          source: instrumented.contract,
          instrumented: instrumented,
        });
      }
    } catch (err) {
      err.message = this._ui.generate("instr-fail", [currentFile]) + err.message;
      throw err;
    }

    return outputs;
  }

  /**
   * Returns a copy of the hit map created during instrumentation.
   * Useful if you'd like to delegate coverage collection to multiple processes.
   * @return {Object} instrumentationData
   */
  getInstrumentationData() {
    return _.cloneDeep(this._instrumenter.instrumentationData);
  }

  resetInstrumentationData() {
    for (let key of Object.keys(this._instrumenter.instrumentationData)) {
      let point = this._instrumenter.instrumentationData[key];
      point.hits = 0;
    }
  }

  /**
   * Sets the hit map object generated during instrumentation. Useful if you'd like
   * to collect data for a pre-existing instrumentation.
   * @param {Object} data
   */
  setInstrumentationData(data = {}) {
    this._instrumenter.instrumentationData = _.cloneDeep(data);
  }

  /**
   * Enables coverage collection on in-process ethereum client server, hooking the DataCollector
   * to its VM. By default, method will return a url after server has begun listening on the port
   * specified in the config. When `autoLaunchServer` is false, method returns`ganache.server` so
   * the consumer can control the 'server.listen' invocation themselves.
   * @param  {Object} client             ganache client
   * @param  {Boolean} autoLaunchServer  boolean
   * @return {<Promise> (String | Server) }  address of server to connect to, or initialized, unlaunched server.
   */
  async ganache(client: any, autoLaunchServer = false) {
    // Check for port-in-use
    if ((await detect(this._port)) !== this._port) {
      throw new Error(this._ui.generate("server-fail", [this._port]));
    }

    this._collector = new DataCollector(this._instrumenter.instrumentationData);

    this._providerOptions._gasLimit =
      "gasLimit" in this._providerOptions
        ? this._providerOptions._gasLimit
        : this._gasLimitString;

    this._providerOptions.allowUnlimitedContractSize =
      "allowUnlimitedContractSize" in this._providerOptions
        ? this._providerOptions.allowUnlimitedContractSize
        : true;

    // Attach to vm step of supplied client
    try {
      if (this._config.forceBackupServer) throw new Error();
      await this.attachToVM(client);
    } catch (err) {
      // Fallback to ganache-cli)
      const _ganache = require("ganache-cli");
      this._ui.report("vm-fail", [_ganache.version]);
      await this.attachToVM(_ganache);
    }

    if (autoLaunchServer === false || this._autoLaunchServer === false) {
      return this._server;
    }

    await pify(this._server.listen)(this._port);
    const address = `http://${this._host}:${this._port}`;
    this._ui.report("server", [address]);
    return address;
  }

  /**
   * Generate coverage / write coverage report / run istanbul
   */
  async report(_folder: any = undefined) {
    const folder = _folder || this._istanbulFolder;

    const collector = new istanbul.Collector();
    const reporter = new istanbul.Reporter(false, folder);

    return new Promise<void>((resolve, reject) => {
      try {
        this._coverage.generate(this._instrumenter.instrumentationData);

        const mapping = this.makeKeysRelative(this._coverage.data, this._cwd);
        this.saveCoverage(mapping);

        collector.add(mapping);

        this._istanbulReporter.forEach((report) => reporter.add(report));

        // Pify doesn't like this one...
        reporter.write(collector, true, (err) => {
          if (err) return reject(err);

          this._ui.report("istanbul");
          resolve();
        });
      } catch (error) {
        error.message = this._ui.generate("istanbul-fail") + error.message;
        throw error;
      }
    });
  }

  /**
   * Removes coverage build artifacts, kills testrpc.
   */
  async finish() {
    if (this._server && this._server.close) {
      this._ui.report("finish");
      await pify(this._server.close)();
    }
  }
  // ------------------------------------------ Utils ----------------------------------------------

  // ========
  // Provider
  // ========
  async attachToVM(client) {
    const self = this;

    // Fallback to client from options
    if (!client) client = this._client;
    this._server = client.server(this._providerOptions);

    this.assertHasBlockchain(this._server.provider);
    await this.vmIsResolved(this._server.provider);

    const blockchain = this._server.provider.engine.manager.state.blockchain;
    const createVM = blockchain.createVMFromStateTrie;

    // Attach to VM which ganache has already created for transactions
    blockchain.vm.on("step", self._collector.step.bind(self._collector));

    // Hijack createVM method which ganache runs for each `eth_call`
    blockchain.createVMFromStateTrie = function (state, activatePrecompiles) {
      const vm = createVM.apply(blockchain, arguments);
      vm.on("step", self._collector.step.bind(self._collector));
      return vm;
    };
  }

  assertHasBlockchain(provider) {
    assert(provider.engine.manager.state.blockchain !== undefined);
    assert(
      provider.engine.manager.state.blockchain.createVMFromStateTrie !==
        undefined
    );
  }

  async vmIsResolved(provider) {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (provider.engine.manager.state.blockchain.vm !== undefined) {
          clearInterval(interval);
          resolve();
        }
      });
    });
  }

  // ========
  // File I/O
  // ========

  saveCoverage(data) {
    const covPath = path.join(this._cwd, "coverage.json");
    fs.writeFileSync(covPath, JSON.stringify(data));
  }

  // =====
  // Paths
  // =====
  //
  /**
   * Relativizes path keys so that istanbul report can be read on Windows
   * @param  {Object} map  coverage map generated by coverageMap
   * @param  {String} wd   working directory
   * @return {Object}      map with relativized keys
   */
  makeKeysRelative(map, wd) {
    const newCoverage = {};

    Object.keys(map).forEach(
      (pathKey) => (newCoverage[path.relative(wd, pathKey)] = map[pathKey])
    );

    return newCoverage;
  }

  // =======
  // Logging
  // =======

  /**
   * Turn logging off (for CI)
   * @param {Boolean} isSilent
   */
  setLoggingLevel(isSilent) {
    if (isSilent) this._log = () => {};
  }


  get coverage(): any {
    return this._coverage;
  }

  set coverage(value: any) {
    this._coverage = value;
  }

  get instrumenter(): any {
    return this._instrumenter;
  }

  set instrumenter(value: any) {
    this._instrumenter = value;
  }

  get validator(): any {
    return this._validator;
  }

  set validator(value: any) {
    this._validator = value;
  }

  get config(): any {
    return this._config;
  }

  set config(value: any) {
    this._config = value;
  }

  get testsErrored(): boolean {
    return this._testsErrored;
  }

  set testsErrored(value: boolean) {
    this._testsErrored = value;
  }

  get cwd(): string {
    return this._cwd;
  }

  set cwd(value: string) {
    this._cwd = value;
  }

  get defaultHook(): () => void {
    return this._defaultHook;
  }

  set defaultHook(value: () => void) {
    this._defaultHook = value;
  }

  get onServerReady(): (config: any) => void {
    return this._onServerReady;
  }

  set onServerReady(value: (config: any) => void) {
    this._onServerReady = value;
  }

  get onTestsComplete(): (config: any) => void {
    return this._onTestsComplete;
  }

  set onTestsComplete(value: (config: any) => void) {
    this._onTestsComplete = value;
  }

  get onCompileComplete(): (config: any) => void {
    return this._onCompileComplete;
  }

  set onCompileComplete(value: (config: any) => void) {
    this._onCompileComplete = value;
  }

  get onIstanbulComplete(): (config: any) => void {
    return this._onIstanbulComplete;
  }

  set onIstanbulComplete(value: (config: any) => void) {
    this._onIstanbulComplete = value;
  }

  get server(): any {
    return this._server;
  }

  set server(value: any) {
    this._server = value;
  }

  get defaultPort(): number {
    return this._defaultPort;
  }

  set defaultPort(value: number) {
    this._defaultPort = value;
  }

  get client(): any {
    return this._client;
  }

  set client(value: any) {
    this._client = value;
  }

  get defaultNetworkName(): string {
    return this._defaultNetworkName;
  }

  set defaultNetworkName(value: string) {
    this._defaultNetworkName = value;
  }

  get port(): any {
    return this._port;
  }

  set port(value: any) {
    this._port = value;
  }

  get host(): string {
    return this._host;
  }

  set host(value: string) {
    this._host = value;
  }

  get providerOptions(): any {
    return this._providerOptions;
  }

  set providerOptions(value: any) {
    this._providerOptions = value;
  }

  get autoLaunchServer(): boolean {
    return this._autoLaunchServer;
  }

  set autoLaunchServer(value: boolean) {
    this._autoLaunchServer = value;
  }

  get skipFiles(): any {
    return this._skipFiles;
  }

  set skipFiles(value: any) {
    this._skipFiles = value;
  }

  get log(): any {
    return this._log;
  }

  set log(value: any) {
    this._log = value;
  }

  get gasLimit(): number {
    return this._gasLimit;
  }

  set gasLimit(value: number) {
    this._gasLimit = value;
  }

  get gasLimitString(): string {
    return this._gasLimitString;
  }

  set gasLimitString(value: string) {
    this._gasLimitString = value;
  }

  get gasPrice(): number {
    return this._gasPrice;
  }

  set gasPrice(value: number) {
    this._gasPrice = value;
  }

  get istanbulFolder(): any {
    return this._istanbulFolder;
  }

  set istanbulFolder(value: any) {
    this._istanbulFolder = value;
  }

  get istanbulReporter(): any {
    return this._istanbulReporter;
  }

  set istanbulReporter(value: any) {
    this._istanbulReporter = value;
  }

  get ui(): any {
    return this._ui;
  }

  set ui(value: any) {
    this._ui = value;
  }

  get collector(): any {
    return this._collector;
  }

  set collector(value: any) {
    this._collector = value;
  }
}
