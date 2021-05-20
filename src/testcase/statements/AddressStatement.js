"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressStatement = void 0;
const syntest_framework_1 = require("syntest-framework");
/**
 * Special statement specific to solidity contracts
 * @author Dimitri Stallenberg
 */
class AddressStatement extends syntest_framework_1.PrimitiveStatement {
    constructor(type, uniqueId, value, account) {
        super(type, uniqueId, value);
        this._account = account;
    }
    mutate(sampler, depth) {
        if (syntest_framework_1.prng.nextBoolean(syntest_framework_1.Properties.resample_gene_probability)) {
            return (sampler.sampleStatement(depth, this.type, "primitive"));
        }
        if (syntest_framework_1.prng.nextBoolean)
            return new AddressStatement(this.type, syntest_framework_1.prng.uniqueId(), `accounts[${this._account + 1}]`, this._account + 1);
        else
            return new AddressStatement(this.type, syntest_framework_1.prng.uniqueId(), `accounts[${this._account - 1}]`, this._account - 1);
    }
    copy() {
        return new AddressStatement(this.type, this.id, this.value, this._account);
    }
    static getRandom(type = "address") {
        const account = syntest_framework_1.prng.nextInt(-1, 5);
        const value = `accounts[${account}]`;
        return new AddressStatement(type, syntest_framework_1.prng.uniqueId(), value, account);
    }
    get account() {
        return this._account;
    }
}
exports.AddressStatement = AddressStatement;
//# sourceMappingURL=AddressStatement.js.map