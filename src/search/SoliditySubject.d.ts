import { ActionDescription, CFG, SearchSubject, Encoding, ObjectiveFunction } from "syntest-framework";
export declare class SoliditySubject<T extends Encoding> extends SearchSubject<T> {
    private _functionCalls;
    constructor(name: string, cfg: CFG, functionMap: any);
    protected _extractObjectives(): void;
    findChildren(obj: ObjectiveFunction<T>): ObjectiveFunction<T>[];
    get functionCalls(): FunctionDescription[];
    set functionCalls(value: FunctionDescription[]);
    getPossibleActions(type?: string, returnType?: string): FunctionDescription[];
    parseActions(): void;
}
export interface FunctionDescription extends ActionDescription {
    name: string;
    type: string;
    visibility: string;
    returnType: string;
    args: ArgumentDescription[];
}
export interface ConstructorDescription extends FunctionDescription {
    name: string;
    type: string;
    args: ArgumentDescription[];
}
export interface ArgumentDescription {
    type: string;
    bits?: number;
    decimals?: number;
}
//# sourceMappingURL=SoliditySubject.d.ts.map