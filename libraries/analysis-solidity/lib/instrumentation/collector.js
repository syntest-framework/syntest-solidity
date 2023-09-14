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
import web3Utils from "web3-utils";
import DataCollector from "solidity-coverage/lib/collector";

/**
 * @author Annibale Panichella
 * @author Dimitri Stallenberg
 */
class SyntestDataCollector extends DataCollector {
  constructor(instrumentationData = {}) {
    super(instrumentationData);
    // TODO: why is this duplicated
    this.instrumentationData = instrumentationData;

    // TODO: why is this duplicate
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
      const index = info.stack.length - 1;
      let hash = web3Utils.toHex(info.stack[index]).toString();
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
    } catch {
      return Number(BigInt.asUintN(64, ~BigInt(value) + BigInt(1))) * -1;
    }
  }
}

export default SyntestDataCollector;
