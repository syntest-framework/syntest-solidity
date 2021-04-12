const web3Utils = require("web3-utils");
const DataCollector = require("solidity-coverage/lib/collector");

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
    if (["GT", "SGT", "LT", "SLT", "EQ"].includes(info.opcode.name)) {
      let left = this._convertToDecimal(info.stack[info.stack.length - 1]);
      let right = this._convertToDecimal(info.stack[info.stack.length - 2]);

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
          if (this.instrumentationData[hash].left === undefined) {
            this.instrumentationData[hash].left = [this.lastComparison.left];
            this.instrumentationData[hash].right = [this.lastComparison.right];
          } else {
            this.instrumentationData[hash].left.push(this.lastComparison.left);
            this.instrumentationData[hash].right.push(
              this.lastComparison.right
            );
          }
          this.instrumentationData[hash].opcode = this.lastComparison.opcode;
        }
      }
    }
  }

  _convertToDecimal(value) {
    try {
      return web3Utils.toDecimal(value);
    } catch (err) {
      return Number(BigInt.asUintN(64, ~BigInt(value) + BigInt(1))) * -1;
    }
  }
}

module.exports = SyntestDataCollector;
