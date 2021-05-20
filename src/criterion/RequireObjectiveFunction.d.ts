import { Encoding, SearchSubject, ProbeObjectiveFunction } from "syntest-framework";
export declare class RequireObjectiveFunction<T extends Encoding> extends ProbeObjectiveFunction<T> {
    constructor(subject: SearchSubject<T>, id: string, line: number, locationIdx: number, type: boolean);
    calculateDistance(encoding: T): number;
    getIdentifier(): string;
    getSubject(): SearchSubject<T>;
    get type(): boolean;
}
//# sourceMappingURL=RequireObjectiveFunction.d.ts.map