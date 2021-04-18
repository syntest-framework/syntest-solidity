import {CFG, Node, Operation, Edge, CFGFactory} from 'syntest-framework'

// TODO break and continue statements

interface ReturnValue {
    childNodes: Node[]
    breakNodes: Node[]
}

/**
 * @author Dimitri Stallenberg
 */
export class SolidityCFGFactory implements CFGFactory {

    private count = 0;

    convertAST(AST: any, compress = true): CFG {
        this.count = 0;

        const cfg: CFG = {
            edges: [], nodes: []
        }

        this.visitChild(cfg, AST, [])

        if (compress) {
            this.compress(cfg)
        }

        return cfg
    }

    compress(cfg: CFG) {
        const roots = cfg.nodes.filter((n) => n.root)

        // create  node map for easy lookup
        const nodeMap = new Map<string, Node>()
        for (const node of cfg.nodes) {
            nodeMap[node.id] = node
        }

        // create outgoing edge map for easy lookup
        const outEdgeMap = new Map<string, string[]>()
        for (const edge of cfg.edges) {
            if (!outEdgeMap[edge.from]) {
                outEdgeMap[edge.from] = []
            }
            outEdgeMap[edge.from].push(edge.to)
        }

        const discoveredMap = new Map<string, boolean>()

        const removedNodes = []
        // const removedEdges = []

        let possibleCompression = []
        for (const root of roots) {
            const stack: Node[] = [root]
            while (stack.length != 0) {
                const currentNode = stack.pop()
                const outGoingEdges = outEdgeMap[currentNode.id] || []

                if (outGoingEdges.length === 1) {
                    // exactly one next node so compression might be possible
                    possibleCompression.push(currentNode)
                } else if (outGoingEdges.length !== 1) {
                    // zero or more than one outgoing edges so the compression ends here
                    const description = []

                    const incomingEdges: Edge[][] = []

                    for (let i = 0; i < possibleCompression.length - 1; i++) {
                        const node = possibleCompression[i]
                        if (node.root) {
                            // do not remove root nodes
                            continue
                        }

                        removedNodes.push(node)
                        description.push(node.line)

                        incomingEdges.push(cfg.edges.filter((e) => e.to === node.id))
                    }

                    if (possibleCompression.length > 0) {
                        let nodeId = currentNode.id
                        if (outGoingEdges.length === 0) {
                            // no next nodes so we can also remove the last one
                            const lastNode = possibleCompression[possibleCompression.length - 1]
                            // unless it is a root node
                            if (!lastNode.root) {
                                removedNodes.push(lastNode)
                                description.push(lastNode.line)

                                incomingEdges.push(cfg.edges.filter((e) => e.to === lastNode.id))
                            }

                            // change the current node to be the compressed version of all previous nodes
                            currentNode.description = description.join(', ')
                        } else {
                            // change the current node to be the compressed version of all previous nodes
                            possibleCompression[possibleCompression.length - 1].description = description.join(', ')
                            nodeId = possibleCompression[possibleCompression.length - 1].id
                        }

                        // change the edges pointing to any of the removed nodes
                        for (const edges of incomingEdges) {
                            for (const edge of edges) {
                                edge.to = nodeId
                            }
                        }
                    }



                    // reset compression
                    possibleCompression = []
                }

                if (!discoveredMap[currentNode.id]) {
                    discoveredMap[currentNode.id] = true
                    for (const to of outGoingEdges) {
                        stack.push(nodeMap[to])
                    }
                }
            }

            // reset compressions before going to the next root
            possibleCompression = []
        }


        cfg.nodes = cfg.nodes.filter((n) => !removedNodes.includes(n))
        // remove edges of which the to/from has been removed
        cfg.edges = cfg.edges.filter((e) => !removedNodes.find((n) => n.id === e.to || n.id === e.from))

        // TODO also remove unreachable code
    }

    /**
     * This method creates edges to connect the given parents to the given children
     * @param cfg the cfg to add the edges to
     * @param parents the parent nodes
     * @param children the child nodes
     * @private
     */
    private connectParents(cfg: CFG, parents: Node[], children: Node[]) {
        for (const parent of parents) {
            for (const child of children) {
                cfg.edges.push({
                    from: parent.id,
                    to: child.id
                })
            }
        }
    }

    /**
     * This method creates a new node in the cfg
     * @param cfg the cfg to add the node to
     * @param line the line number of the node
     * @param branch whether this nodes is a branching node (i.e. multiple outgoing edges)
     * @param condition if it is a branch node this is the condition to branch on
     * @private
     */
    private createNode(cfg: CFG, line: number, branch: boolean, condition?: Operation): Node {
        const node: Node = {
            id: `${this.count++}`,
            line: line,
            root: false,
            branch: branch,
            condition: condition
        }

        cfg.nodes.push(node)

        return node
    }

    /**
     * This method visit a child node in the AST using the visitor design pattern.
     *
     * @param cfg the Control Flow Graph we are generating
     * @param child the child AST node
     * @param parents the parents of the child
     * @private
     */
    private visitChild(cfg: CFG, child: any, parents: Node[], contractName?: string): ReturnValue {
         const skipable: string[] = [
             'PragmaDirective',
             'StateVariableDeclaration',
             'ImportDirective', // TODO maybe we should also connect the other contract?
             'EventDefinition', // TODO ternary/conditionals
             'EmitStatement', // TODO ternary/conditionals
             'ModifierDefinition', // TODO ternary/conditionals
             'StructDefinition', // TODO ternary/conditionals
             'UsingForDeclaration', // TODO ternary/conditionals
             'InlineAssemblyStatement', // TODO ternary/conditionals
             'BinaryOperation',
             'Identifier',
             'BooleanLiteral',
             'NumberLiteral'
         ]

        if (skipable.includes(child.type)) {
            return {
                childNodes: parents,
                breakNodes: []
            }
        }

        switch (child.type) {
            case 'SourceUnit': return this.SourceUnit(cfg, child);
            case 'ContractDefinition': return this.ContractDefinition(cfg, child)
            case 'FunctionDefinition': return this.FunctionDefinition(cfg, child, contractName)
            case 'Block': return this.Block(cfg, child, parents)

            case 'IfStatement': return this.IfStatement(cfg, child, parents)
            case 'Conditional': return this.Conditional(cfg, child, parents)

            case 'ForStatement': return this.ForStatement(cfg, child, parents)
            case 'WhileStatement': return this.WhileStatement(cfg, child, parents)
            case 'DoWhileStatement': return this.DoWhileStatement(cfg, child, parents)

            case 'VariableDeclarationStatement': return this.VariableDeclarationStatement(cfg, child, parents)
            case 'ExpressionStatement': return this.ExpressionStatement(cfg, child, parents)
            case 'ReturnStatement': return this.ReturnStatement(cfg, child, parents)
            case 'BreakStatement': return this.BreakStatement(cfg, child, parents)

        }

        console.log(child)
        throw new Error(`AST type: ${child.type} is not supported currently!`)
    }

    private SourceUnit(cfg: CFG, AST: any): ReturnValue {
        for (const child of AST.children) {
            this.visitChild(cfg, child, [])
        }

        return {
            childNodes: [],
            breakNodes: []
        }
    }

    private ContractDefinition(cfg: CFG, AST: any): ReturnValue {
        for (const child of AST.subNodes) {
            this.visitChild(cfg, child, [], AST.name)
        }

        return {
            childNodes: [],
            breakNodes: []
        }
    }

    private FunctionDefinition(cfg: CFG, AST: any, contractName?: string): ReturnValue {
        const node: Node = {
            id: `${this.count++}`,
            line: AST.loc.start.line,
            branch: false,
            root: true,
            functionName: AST.name,
            contractName: contractName,
            isConstructor: AST.isConstructor
        }

        cfg.nodes.push(node)

        // This is a root so no parent nodes needed
        // this.connectParents(cfg, parents, [node])

        // TODO parameters
        // TODO return parameters

        // check if body is block (idk if abstract function definitions are allowed for example)
        if (AST.body) {
            this.visitChild(cfg, AST.body, [node])
        }

        return {
            childNodes: [node],
            breakNodes: []
        }
    }

    private Block(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        let nodes = parents

        const totalBreakNodes = []
        for (const child of AST.statements) {
            const {childNodes, breakNodes} = this.visitChild(cfg, child, nodes)
            nodes = childNodes
            totalBreakNodes.push(...breakNodes)
        }

        return {
            childNodes: nodes,
            breakNodes: totalBreakNodes
        } // TODO

    }

    private IfStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, true, {
                type: AST.condition.type,
                operator: AST.condition.operator
            })

        this.connectParents(cfg, parents, [node])

        const totalBreakNodes = []
        let count = cfg.edges.length
        const {childNodes, breakNodes} = this.visitChild(cfg, AST.trueBody, [node])
        const trueNodes = childNodes
        totalBreakNodes.push(...breakNodes)
        // change first added edge
        if (!cfg.edges[count]) {
            // apparently there is no childnode/edge being created so we add one
            const emptyChildNode = this.createNode(cfg, AST.trueBody.loc.start.line, false)
            this.connectParents(cfg, [node], [emptyChildNode])
            trueNodes.push(emptyChildNode)
        }
        cfg.edges[count].branchType = true

        if (AST.falseBody) {
            count = cfg.edges.length
            const {childNodes, breakNodes} = this.visitChild(cfg, AST.falseBody, [node])
            const falseNodes = childNodes
            totalBreakNodes.push(...breakNodes)
            if (!cfg.edges[count]) {
                // apparently there is no childnode/edge being created so we add one
                const emptyChildNode = this.createNode(cfg, AST.falseBody.loc.start.line, false)
                this.connectParents(cfg, [node], [emptyChildNode])
                trueNodes.push(emptyChildNode)
            }
            cfg.edges[count].branchType = false
            return {
                childNodes: [...trueNodes, ...falseNodes],
                breakNodes: totalBreakNodes
            }
        } else {
            const falseNode: Node = this.createNode(cfg, AST.loc.end.line, false)

            cfg.edges.push({
                from: node.id,
                to: falseNode.id,
                branchType: false
            })

            return{
                childNodes: [...trueNodes, falseNode],
                breakNodes: totalBreakNodes
            }
        }
    }

    private Conditional(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, true, {
            type: AST.condition.type,
            operator: AST.condition.operator
        })

        this.connectParents(cfg, parents, [node])

        const totalBreakNodes = []
        let count = cfg.edges.length
        const {childNodes, breakNodes} = this.visitChild(cfg, AST.trueExpression, [node])
        const trueNodes = childNodes
        totalBreakNodes.push(...breakNodes)
        // change first added edge
        if (!cfg.edges[count]) {
            // apparently there is no childnode/edge being created so we add one
            const emptyChildNode = this.createNode(cfg, AST.trueExpression.loc.start.line, false)
            this.connectParents(cfg, [node], [emptyChildNode])
            trueNodes.push(emptyChildNode)
        }
        cfg.edges[count].branchType = true

        if (AST.falseBody) {
            count = cfg.edges.length
            const {childNodes, breakNodes} = this.visitChild(cfg, AST.falseExpression, [node])
            const falseNodes = childNodes
            totalBreakNodes.push(...breakNodes)
            if (!cfg.edges[count]) {
                // apparently there is no childnode/edge being created so we add one
                const emptyChildNode = this.createNode(cfg, AST.falseExpression.loc.start.line, false)
                this.connectParents(cfg, [node], [emptyChildNode])
                falseNodes.push(emptyChildNode)
            }
            cfg.edges[count].branchType = false
            return {
                childNodes: [...trueNodes, ...falseNodes],
                breakNodes: totalBreakNodes
            }
        } else {
            const falseNode: Node = this.createNode(cfg, AST.loc.end.line, false)

            cfg.edges.push({
                from: node.id,
                to: falseNode.id,
                branchType: false
            })

            return{
                childNodes: [...trueNodes, falseNode],
                breakNodes: totalBreakNodes
            }
        }
    }

    private ForStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, true, {
            type: AST.conditionExpression.type,
            operator: AST.conditionExpression.operator
        })
        // TODO For each problably not supported

        // TODO init expression
        // TODO condition expression
        // TODO loopExpression

        this.connectParents(cfg, parents, [node])

        const count = cfg.edges.length
        const {childNodes, breakNodes} = this.visitChild(cfg, AST.body, [node])
        const trueNodes = childNodes
        cfg.edges[count].branchType = true
        const falseNode: Node = this.createNode(cfg, AST.loc.end.line,  false)

        cfg.edges.push({
            from: node.id,
            to: falseNode.id,
            branchType: false
        })

        for (const breakNode of breakNodes) {
            cfg.edges.push({
                from: breakNode.id,
                to: falseNode.id
            })
        }

        this.connectParents(cfg, trueNodes, [node])

        return {
            childNodes: [falseNode],
            breakNodes: []
        }
    }

    private WhileStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, true, {
            type: AST.condition.type,
            operator: AST.condition.operator
        })

        this.connectParents(cfg, parents, [node])

        const count = cfg.edges.length
        const {childNodes, breakNodes} = this.visitChild(cfg, AST.body, [node])
        const trueNodes = childNodes

        cfg.edges[count].branchType = true
        const falseNode: Node = this.createNode(cfg, AST.loc.end.line, false)

        cfg.edges.push({
            from: node.id,
            to: falseNode.id,
            branchType: false
        })

        for (const breakNode of breakNodes) {
            cfg.edges.push({
                from: breakNode.id,
                to: falseNode.id
            })
        }

        this.connectParents(cfg, trueNodes, [node])

        return {
            childNodes: [falseNode],
            breakNodes: []
        }
    }

    private DoWhileStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        // entry node
        const entryNode: Node = this.createNode(cfg, AST.loc.start.line, true, {
            type: AST.condition.type,
            operator: AST.condition.operator
        })

        this.connectParents(cfg, parents, [entryNode])

        // 'do' block
        const {childNodes, breakNodes} = this.visitChild(cfg, AST.body, [entryNode])
        const trueNodes = childNodes

        // while check
        const whileNode: Node = this.createNode(cfg, AST.loc.start.line, true, {
            type: AST.condition.type,
            operator: AST.condition.operator
        })

        this.connectParents(cfg, trueNodes, [whileNode])

        // connect back to the entry node and mark as true branch
        const count = cfg.edges.length
        this.connectParents(cfg, [whileNode], [entryNode])
        cfg.edges[count].branchType = true

        const falseNode: Node = this.createNode(cfg, AST.loc.end.line, false)

        cfg.edges.push({
            from: whileNode.id,
            to: falseNode.id,
            branchType: false
        })

        // check for breaks
        for (const breakNode of breakNodes) {
            cfg.edges.push({
                from: breakNode.id,
                to: falseNode.id
            })
        }

        return {
            childNodes: [falseNode],
            breakNodes: []
        }
    }

    private VariableDeclarationStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        return {
            childNodes: [node],
            breakNodes: []
        }
    }

    private ExpressionStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        return {
            childNodes: [node],
            breakNodes: []
        }
    }

    /**
     * This is a terminating node
     * @param cfg
     * @param AST
     * @param parents
     * @constructor
     * @private
     */
    private ReturnStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        this.visitChild(cfg, AST.expression, [node])

        return {
            childNodes: [],
            breakNodes: []
        }
    }

    /**
     * This is a break statement
     * @param cfg
     * @param AST
     * @param parents
     * @constructor
     * @private
     */
    private BreakStatement(cfg: CFG, AST: any, parents: Node[]): ReturnValue {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        return {
            childNodes: [],
            breakNodes: [node]
        }
    }
}
