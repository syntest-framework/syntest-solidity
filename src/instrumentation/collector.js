const web3Utils = require("web3-utils");
const SolidityCollector = require("solidity-coverage/lib/injector")

/**
 * @author Annibale Panichella
 * @author Dimitri Stallenberg
 */
class DataCollector extends SolidityCollector {
  constructor(instrumentationData = {}) {
    super(instrumentationData);
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

          if (this.instrumentationData[hash].type === "branch" ||
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

}

module.exports = DataCollector;
