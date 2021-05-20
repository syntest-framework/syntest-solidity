"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ByteStatement = void 0;
const syntest_framework_1 = require("syntest-framework");
/**
 * Special statement specific to solidity contracts
 * @author Annibale Panichella
 */
class ByteStatement extends syntest_framework_1.PrimitiveStatement {
    constructor(type, uniqueId, bytes) {
        super(type, uniqueId, bytes);
    }
    copy() {
        return new ByteStatement(this.type, syntest_framework_1.prng.uniqueId(), [...this.value]);
    }
    mutate(sampler, depth) {
        if (syntest_framework_1.prng.nextBoolean(syntest_framework_1.Properties.delta_mutation_probability)) {
            const index = syntest_framework_1.prng.nextInt(0, this.value.length - 1);
            const change = syntest_framework_1.prng.nextGaussian(0, 3);
            const newBytes = [...this.value];
            const newValue = Math.round(newBytes[index] + change);
            newBytes[index] = Math.max(ByteStatement._lower_bound, newValue);
            newBytes[index] = Math.min(ByteStatement._upper_bound, newValue);
            return new ByteStatement(this.type, syntest_framework_1.prng.uniqueId(), newBytes);
        }
        return ByteStatement.getRandom(this.type, this.value.length);
    }
    static getRandom(type = "byte", nBytes = 1) {
        const bytes = [];
        for (let index = 0; index < nBytes; index++) {
            bytes[index] = syntest_framework_1.prng.nextInt(ByteStatement._lower_bound, ByteStatement._upper_bound);
        }
        return new ByteStatement(type, syntest_framework_1.prng.uniqueId(), bytes);
    }
}
exports.ByteStatement = ByteStatement;
ByteStatement._upper_bound = 32;
ByteStatement._lower_bound = 0;
//# sourceMappingURL=ByteStatement.js.map