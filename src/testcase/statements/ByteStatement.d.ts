import { PrimitiveStatement, TestCaseSampler } from "syntest-framework";
/**
 * Special statement specific to solidity contracts
 * @author Annibale Panichella
 */
export declare class ByteStatement extends PrimitiveStatement<number[]> {
    private static _upper_bound;
    private static _lower_bound;
    constructor(type: string, uniqueId: string, bytes: number[]);
    copy(): ByteStatement;
    mutate(sampler: TestCaseSampler, depth: number): ByteStatement;
    static getRandom(type?: string, nBytes?: number): ByteStatement;
}
//# sourceMappingURL=ByteStatement.d.ts.map