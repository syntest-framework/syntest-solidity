import { SolidityCFGFactory } from "../../src";
import * as chai from "chai";
const SolidityParser = require("@solidity-parser/parser");

const expect = chai.expect;

describe("SolidityCFGFactory", () => {
  it("generates right cfg from ast", () => {
    const factory = new SolidityCFGFactory();

    const source = `// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

contract MetaCoin {
    mapping (address => uint) balances;

    constructor() public {
        balances[tx.origin] = 10000;
    }

    function sendCoin(address receiver, uint amount) public returns(bool sufficient) {
        if (balances[msg.sender] < amount) {
            return false;
        } else {
            for (int i = 0; i < 10; i++) {
                if (amount > 9000) {
                    amount -= 10;
                }
            }
        }

        while (amount < 5) {
            amount += 1;
        }

        return true;
    }

}


        `;

    const ast = SolidityParser.parse(source, { loc: true, range: true });

    const cfg = factory.convertAST(ast);
    expect(cfg.edges.length === 12);
    expect(cfg.nodes.length === 11);
    console.log(cfg);

    // drawGraph(cfg, "./temp/graph.svg");
    // expect(statement != null);
  });
});
