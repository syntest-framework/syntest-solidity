import {CFG, Node, Operation, Edge, CFGFactory} from 'syntest-framework'

// TODO break and continue statements

/**
 * @author Dimitri Stallenberg
 */
export class SolidityCFGFactory implements CFGFactory {

    private count = 0;

    convertAST(AST: any): CFG {
        this.count = 0;

        const cfg: CFG = {
            edges: [], nodes: []
        }

        this.visitChild(cfg, AST, [])

        return this.compress(cfg)
    }

    compress(cfg: CFG): CFG {
        // TODO
        return cfg
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
    private visitChild(cfg: CFG, child: any, parents: Node[], contractName?: string): Node[] {
         const skipable: string[] = [
             'PragmaDirective',
             'StateVariableDeclaration',
             'ImportDirective', // TODO maybe we should also connect the other contract?
             'EventDefinition', // TODO
             'EmitStatement', // TODO
             'ModifierDefinition', // TODO
             'StructDefinition', // TODO
             'UsingForDeclaration', // TODO
             'InlineAssemblyStatement', // TODO
        ]

        if (skipable.includes(child.type)) {
            return parents
        }

        switch (child.type) {
            case 'SourceUnit': return this.SourceUnit(cfg, child);
            case 'ContractDefinition': return this.ContractDefinition(cfg, child, parents)
            case 'FunctionDefinition': return this.FunctionDefinition(cfg, child, contractName)
            case 'Block': return this.Block(cfg, child, parents)
            case 'IfStatement': return this.IfStatement(cfg, child, parents)
            case 'ForStatement': return this.ForStatement(cfg, child, parents)
            case 'WhileStatement': return this.WhileStatement(cfg, child, parents)
            case 'VariableDeclarationStatement': return this.VariableDeclarationStatement(cfg, child, parents)
            case 'ExpressionStatement': return this.ExpressionStatement(cfg, child, parents)

            case 'ReturnStatement': return this.ReturnStatement(cfg, child, parents)
        }

        console.log(child)
        throw new Error(`AST type: ${child.type} is not supported currently!`)
    }

    private SourceUnit(cfg: CFG, AST: any): Node[] {
        for (const child of AST.children) {
            this.visitChild(cfg, child, [])
        }

        return []
    }

    private ContractDefinition(cfg: CFG, AST: any, parents: Node[]): Node[] {
        for (const child of AST.subNodes) {
            this.visitChild(cfg, child, [], AST.name)
        }

        return []
    }

    private FunctionDefinition(cfg: CFG, AST: any, contractName?: string): Node[] {
        // only visible functions?
        if (['internal', 'private'].includes(AST.visibility)) {
            return []
        }

        const node: Node = {
            id: `${this.count++}`,
            line: AST.loc.start.lin,
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

        return [node]
    }

    private Block(cfg: CFG, AST: any, parents: Node[]): Node[] {
        let nodes = parents

        for (const child of AST.statements) {
            nodes = this.visitChild(cfg, child, nodes)
        }

        return nodes // TODO
    }

    private IfStatement(cfg: CFG, AST: any, parents: Node[]): Node[] {
        const node: Node = this.createNode(cfg, AST.loc.start.line, true, {
                type: AST.condition.type,
                operator: AST.condition.operator
            })

        this.connectParents(cfg, parents, [node])

        let count = cfg.edges.length
        const trueNodes = this.visitChild(cfg, AST.trueBody, [node])
        // change first added edge
        cfg.edges[count].branchType = true

        if (AST.falseBody) {
            count = cfg.edges.length
            const falseNodes = this.visitChild(cfg, AST.falseBody, [node])
            cfg.edges[count].branchType = false
            return [...trueNodes, ...falseNodes]
        } else {
            const falseNode: Node = this.createNode(cfg, AST.loc.end.line, false)

            cfg.edges.push({
                from: node.id,
                to: falseNode.id,
                branchType: false
            })

            return [...trueNodes, falseNode]
        }
    }

    private ForStatement(cfg: CFG, AST: any, parents: Node[]): Node[] {
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
        const trueNodes = this.visitChild(cfg, AST.body, [node])
        cfg.edges[count].branchType = true
        const falseNode: Node = this.createNode(cfg, AST.loc.end.line,  false)

        cfg.edges.push({
            from: node.id,
            to: falseNode.id,
            branchType: false
        })

        this.connectParents(cfg, trueNodes, [node])

        return [falseNode]
    }

    private WhileStatement(cfg: CFG, AST: any, parents: Node[]): Node[] {
        const node: Node = this.createNode(cfg, AST.loc.start.line, true, {
            type: AST.condition.type,
            operator: AST.condition.operator
        })

        this.connectParents(cfg, parents, [node])

        const count = cfg.edges.length
        const trueNodes = this.visitChild(cfg, AST.body, [node])
        cfg.edges[count].branchType = true
        const falseNode: Node = this.createNode(cfg, AST.loc.end.line, false)

        cfg.edges.push({
            from: node.id,
            to: falseNode.id,
            branchType: false
        })

        this.connectParents(cfg, trueNodes, [node])

        return [falseNode]
    }

    private VariableDeclarationStatement(cfg: CFG, AST: any, parents: Node[]): Node[] {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        return [node]
    }


    private ExpressionStatement(cfg: CFG, AST: any, parents: Node[]): Node[] {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        return [node]
    }

    //  this is a terminating node sooo maybe not return anything? and then check in the parent node

    /**
     * This is a terminating node
     * @param cfg
     * @param AST
     * @param parents
     * @constructor
     * @private
     */
    private ReturnStatement(cfg: CFG, AST: any, parents: Node[]): Node[] {
        const node: Node = this.createNode(cfg, AST.loc.start.line, false)

        this.connectParents(cfg, parents, [node])

        // TODO we should still check for ternary expressions here
        return []
    }
}
