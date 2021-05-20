import { PrimitiveStatement, TestCaseSampler } from "syntest-framework";
/**
 * Special statement specific to solidity contracts
 * @author Dimitri Stallenberg
 */
export declare class AddressStatement extends PrimitiveStatement<string> {
    private _account;
    constructor(type: string, uniqueId: string, value: string, account: number);
    mutate(sampler: TestCaseSampler, depth: number): AddressStatement;
    copy(): AddressStatement;
    static getRandom(type?: string): AddressStatement;
    get account(): number;
}
//# sourceMappingURL=AddressStatement.d.ts.map