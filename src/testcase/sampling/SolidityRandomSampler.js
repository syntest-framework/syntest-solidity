"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolidityRandomSampler = void 0;
const syntest_framework_1 = require("syntest-framework");
const SoliditySampler_1 = require("./SoliditySampler");
const AddressStatement_1 = require("../statements/AddressStatement");
const bignumber_js_1 = require("bignumber.js");
const ByteStatement_1 = require("../statements/ByteStatement");
/**
 * SolidityRandomSampler class
 *
 * @author Dimitri Stallenberg
 */
class SolidityRandomSampler extends SoliditySampler_1.SoliditySampler {
    /**
     * Constructor
     */
    constructor(subject) {
        super(subject);
    }
    sample() {
        const root = this.sampleConstructor(0);
        const nCalls = syntest_framework_1.prng.nextInt(1, 5);
        for (let index = 0; index <= nCalls; index++) {
            const call = this.sampleMethodCall(root);
            root.setMethodCall(index, call);
        }
        return new syntest_framework_1.TestCase(root);
    }
    sampleMethodCall(root) {
        const actions = this._subject.getPossibleActions("function");
        const action = syntest_framework_1.prng.pickOne(actions);
        const args = [];
        for (const arg of action.args) {
            if (arg.type != "")
                args.push(this.sampleArgument(1, arg.type, arg.bits));
        }
        let uniqueID = syntest_framework_1.prng.uniqueId();
        if (action.returnType == "")
            uniqueID = "var" + uniqueID;
        const call = new syntest_framework_1.ObjectFunctionCall(action.returnType, uniqueID, root, action.name, args);
        return call;
    }
    sampleConstructor(depth) {
        const constructors = this._subject.getPossibleActions("constructor");
        if (constructors.length > 0) {
            const action = syntest_framework_1.prng.pickOne(this._subject.getPossibleActions("constructor"));
            const args = [];
            for (const arg of action.args) {
                if (arg.type != "")
                    args.push(this.sampleArgument(1, arg.type, arg.bits));
            }
            return new syntest_framework_1.ConstructorCall(action.name, syntest_framework_1.prng.uniqueId(), `${action.name}`, args, []);
        }
        else {
            // if no constructors is available, we invoke the default (implicit) constructor
            return new syntest_framework_1.ConstructorCall(this._subject.name, syntest_framework_1.prng.uniqueId(), `${this._subject.name}`, [], []);
        }
    }
    sampleArgument(depth, type, bits) {
        // check depth to decide whether to pick a variable
        if (depth >= syntest_framework_1.Properties.max_depth) {
            // TODO or take an already available variable
            if (type.includes("int")) {
                return this.sampleNumericGene(depth, type, bits);
            }
            else {
                return this.sampleStatement(depth, type);
            }
        }
        if (this._subject.getPossibleActions().filter((a) => a.type === type)
            .length &&
            syntest_framework_1.prng.nextBoolean(syntest_framework_1.Properties.sample_func_as_arg)) {
            // Pick function
            // TODO or take an already available functionCall
            return this.sampleObjectFunctionCall(depth, type);
        }
        else {
            // Pick variable
            // TODO or take an already available variable
            if (type.includes("int")) {
                return this.sampleNumericGene(depth, type, bits);
            }
            else {
                return this.sampleStatement(depth, type);
            }
        }
    }
    sampleNumericGene(depth, type, bits) {
        let max = new bignumber_js_1.default(2).pow(bits - 1).minus(1);
        if (type.includes("uint")) {
            max = new bignumber_js_1.default(2).pow(bits).minus(1);
            return syntest_framework_1.NumericStatement.getRandom("uint", 0, false, max, new bignumber_js_1.default(0));
        }
        else {
            return syntest_framework_1.NumericStatement.getRandom("int", 0, true, max, max.negated());
        }
        if (type.includes("ufixed")) {
            return syntest_framework_1.NumericStatement.getRandom("ufixed", syntest_framework_1.Properties.numeric_decimals, false);
        }
        else {
            return syntest_framework_1.NumericStatement.getRandom("fixed", syntest_framework_1.Properties.numeric_decimals, true);
        }
    }
    sampleStatement(depth, type, geneType = "primitive") {
        if (geneType === "primitive") {
            if (type === "bool") {
                return syntest_framework_1.BoolStatement.getRandom();
            }
            else if (type === "address") {
                return AddressStatement_1.AddressStatement.getRandom();
            }
            else if (type === "string") {
                return syntest_framework_1.StringStatement.getRandom();
            }
            else if (type.includes("string")) {
                return syntest_framework_1.StringStatement.getRandom();
            }
            else if (type.startsWith("byte")) {
                return this.sampleByteStatement(type);
            }
            else if (type == "") {
                throw new Error(`Type "" not recognized. It must be a bug in our parser!`);
            }
        }
        else if (geneType === "functionCall") {
            return this.sampleObjectFunctionCall(depth, type);
        }
        else if (geneType === "constructor") {
            return this.sampleConstructor(depth);
        }
        throw new Error(`Unknown type ${type} ${geneType}!`);
    }
    sampleByteStatement(type) {
        if (type === "byte" || type === "bytes1")
            return ByteStatement_1.ByteStatement.getRandom("byte", 1);
        else if (type === "bytes") {
            return ByteStatement_1.ByteStatement.getRandom("byte", syntest_framework_1.prng.nextInt(1, 32));
        }
        else {
            const nBytes = type.replace("bytes", "");
            const n = Number.parseInt(nBytes);
            return ByteStatement_1.ByteStatement.getRandom("byte", n);
        }
    }
    sampleObjectFunctionCall(depth, type) {
        const action = syntest_framework_1.prng.pickOne(this._subject.getPossibleActions("function", type));
        const args = [];
        for (const arg of action.args) {
            if (arg.type != "")
                args.push(this.sampleArgument(depth + 1, arg.type, arg.bits));
        }
        const constructor = this.sampleConstructor(depth + 1);
        return new syntest_framework_1.ObjectFunctionCall(action.returnType, syntest_framework_1.prng.uniqueId(), constructor, action.name, args);
    }
}
exports.SolidityRandomSampler = SolidityRandomSampler;
//# sourceMappingURL=SolidityRandomSampler.js.map