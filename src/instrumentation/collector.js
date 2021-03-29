const web3Utils = require("web3-utils");
const DataCollector = require("solidity-coverage/lib/injector");

/**
 * @author Annibale Panichella
 * @author Dimitri Stallenberg
 */
class SyntestDataCollector extends DataCollector {
  constructor(instrumentationData = {}) {
    super(instrumentationData);
    this.instrumentationData = instrumentationData;

    this.validOpcodes = {
      PUSH1: true,
    };

    this.lastComparison = {};
  }

  /**
   * VM step event handler. Detects instrumentation hashes when they are pushed to the
   * top of the stack. This runs millions of times - trying to keep it fast.
   * @param  {Object} info  vm step info
   */
  step(info) {
    try {
      if (["GT", "SGT", "LT", "SLT", "EQ"].includes(info.opcode.name)) {
        let left = web3Utils.toDecimal(info.stack[info.stack.length - 1]);
        let right = web3Utils.toDecimal(info.stack[info.stack.length - 2]);

        this.lastComparison = {
          // ...info.opcode,
          left: left,
          right: right,
          opcode: info.opcode.name,
        };
      }

      if (this.validOpcodes[info.opcode.name] && info.stack.length > 0) {
        const idx = info.stack.length - 1;
        let hash = web3Utils.toHex(info.stack[idx]).toString();
        hash = this._normalizeHash(hash);

        if (this.instrumentationData[hash]) {
          this.instrumentationData[hash].hits++;

          if (
            this.instrumentationData[hash].type === "branch" ||
            this.instrumentationData[hash].type === "requirePre" ||
            this.instrumentationData[hash].type === "requirePost"
          ) {
            this.instrumentationData[hash].left = this.lastComparison.left;
            this.instrumentationData[hash].right = this.lastComparison.right;
            this.instrumentationData[hash].opcode = this.lastComparison.opcode;
          }
        }
      }
    } catch (err) {
      /*Ignore*/
    }
  }

  /**
   * Left-pads zero prefixed bytes 32 hashes to length 66. The '59' in the
   * comparison below is arbitrary. It provides a margin for recurring zeros
   * but prevents left-padding shorter irrelevant hashes (like fn sigs)
   *
   * @param  {String} hash  data hash from evm stack.
   * @return {String}       0x prefixed hash of length 66.
   */
  _normalizeHash(hash) {
    if (hash.length < 66 && hash.length > 59) {
      hash = hash.slice(2);
      while (hash.length < 64) hash = "0" + hash;
      hash = "0x" + hash;
    }
    return hash;
  }
}

module.exports = SyntestDataCollector;
