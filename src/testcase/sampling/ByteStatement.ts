import {
    getProperty,
    PrimitiveStatement,
    prng,
    TestCaseSampler,
} from "syntest-framework";

/**
 * Special statement specific to solidity contracts
 * @author Annibale Panichella
 */
export class ByteStatement extends PrimitiveStatement<number> {
    private _upper_bound: number;
    private _lower_bound: number;

    constructor(
        type: string,
        uniqueId: string,
        value: number,
        upper_bound = 256,
        lower_bound = 0
    ) {
        super(type, uniqueId, value);
        this._upper_bound = upper_bound;
        this._lower_bound = lower_bound;
    }

    copy(): PrimitiveStatement<number> {
        return new ByteStatement(
            this.type,
            prng.uniqueId(),
            this.value,
            this._upper_bound,
            this._lower_bound
        )
    }

    mutate(sampler: TestCaseSampler, depth: number): PrimitiveStatement<number> {
        if (prng.nextBoolean(getProperty("delta_mutation_probability"))) {
            const change = prng.nextGaussian(0, 3);
            let newValue = this.value + change;
            newValue = Math.max(this._lower_bound, newValue);
            newValue = Math.max(this._upper_bound, newValue);

            return new ByteStatement(
                this.type,
                prng.uniqueId(),
                newValue,
                this._upper_bound,
                this._lower_bound
            )
        }

        return ByteStatement.getRandomInstance(this.type, this._upper_bound, this._lower_bound);
    }

    static getRandomInstance(
        type: string,
        upper_bound = 256,
        lower_bound = 0
    ) {
        return new ByteStatement(
            type,
            prng.uniqueId(),
            prng.nextInt(lower_bound, upper_bound),
            upper_bound,
            lower_bound
        )
    }
}