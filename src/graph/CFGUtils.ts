import { CFG, FunctionDescription, RootNode, Visibility } from "syntest-framework";


export function getFunctionDescriptions(cfg: CFG, contractOfInterest: string): FunctionDescription[] {
    let nodes = getRootNodes(cfg)
    nodes = filterRootNodes(nodes, contractOfInterest)
    return convertRootNodeToFunctionDescription(nodes)
}

export function getRootNodes(cfg: CFG): RootNode[] {
    return cfg.nodes
        .filter((node) => node.type === 'root')
        .map((node) => <RootNode>node)
}

export function filterRootNodes(nodes: RootNode[], contractOfInterest: string): RootNode[] {
    return nodes
        .filter((node) => node.contractName === contractOfInterest)
}

export function visibilityToString(visibility: Visibility): string {
    return `${visibility}`
}

export function convertRootNodeToFunctionDescription(nodes: RootNode[]): FunctionDescription[] {
    // TODO bits and decimals?
    return nodes.map((node) => {
        return {
            name: node.functionName,
            type: node.isConstructor ? 'constructor' : 'function',
            visibility: node.visibility,
            parameters: node.parameters,
            returnType: node.returnParameters.length ? node.returnParameters[0].type : 'void' // TODO check if void is correct
        }
    })
}