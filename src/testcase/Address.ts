import {getProperty, prng, Sampler, PrimitiveStatement} from 'syntest-framework'

/**
 * Special statement specific to solidity contracts
 * @author Dimitri Stallenberg
 */
export class Address extends PrimitiveStatement<string> {

    constructor(type: string, uniqueId: string, value: string) {
        super(type, uniqueId, value)
    }

    mutate(sampler: Sampler, depth: number): Address {
        if (prng.nextBoolean(getProperty("resample_gene_probability"))) {
            return sampler.sampleGene(depth, this.type, 'primitive')
        }

        return this.copy()
    }

    copy(): Address {
        return new Address(
            this.type,
            this.id,
            this.value)
    }

    static getRandom(type='string') {
        let value = 'accounts[0]'

        return new Address(
            type,
            prng.uniqueId(),
            value)
    }
}
