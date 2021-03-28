import {CFG, Node, Operation, Edge, CFGFactory} from 'syntest-framework'

interface TempNode extends Node {
    id: string;
    line: number;
    branch: boolean;
    condition?: Operation;
    temporary: boolean;
}

export class SolidityCFGFactory implements CFGFactory {

    private count = 0;

    convertAST(AST: any): CFG {
        this.count = 0;

        const cfg: CFG = {
            edges: [], nodes: []
        }

        this[AST.type](AST, cfg)

        // throw new Error('Method not implemented.');
        return this.compress(cfg)
    }

    compress(cfg: CFG): CFG {
        // TODO
        return cfg
    }

    private connectParents(cfg: CFG, parents: TempNode[], children: TempNode[]) {
        for (const parent of parents) {
            for (const child of children) {
                if (parent.line === 15 && child.line === 21) {
                    throw new Error('xxx')
                }
                cfg.edges.push({
                    from: parent.id,
                    to: child.id
                })
            }
        }
    }

    private createNode(cfg: CFG, line: number, temporary: boolean, branch: boolean, condition?: Operation): TempNode {
        const node: TempNode = {
            id: `${this.count++}`,
            line: line,
            temporary: temporary,
            branch: branch,
            condition: condition
        }

        cfg.nodes.push(node)

        return node
    }

    private SourceUnit(AST: any, cfg: CFG) {
        const root: TempNode = this.createNode(cfg, AST.loc.start.line, false, false)

        for (const child of AST.children) {
            this[child.type](child, cfg, [root])
        }
    }

    private PragmaDirective(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        // const node: TempNode = {
        //     id: `${this.count++}`,
        //     line: AST.loc.start.line,
        //     temporary: true
        // }
        //
        // cfg.nodes.push(node)
        //
        // cfg.edges.push({
        //     from: parent.id,
        //     to: node.id
        // })

        // skip

        return parents
    }

    private ContractDefinition(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, true, false)

        this.connectParents(cfg, parents, [node])

        for (const child of AST.subNodes) {
            this[child.type](child, cfg, [node])
        }

        return [node]
    }

    private StateVariableDeclaration(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        // const node: TempNode = {
        //     id: `${this.count++}`,
        //     line: AST.loc.start.line,
        //     temporary: true
        // }
        //
        // cfg.nodes.push(node)
        //
        // cfg.edges.push({
        //     from: parent.id,
        //     to: node.id
        // })

        // skip

        return parents
    }

    private FunctionDefinition(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, false, false)


        this.connectParents(cfg, parents, [node])


        // TODO parameters
        // TODO return parameters
        // TODO visibility
        // TODO isConstructor

        // TODO check if body is block

        this[AST.body.type](AST.body, cfg, [node])

        return [node]
    }

    private Block(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        let nodes = parents

        // console.log(AST)
        for (const child of AST.statements) {
            console.log(child)
            nodes = this[child.type](child, cfg, nodes)
        }

        return nodes // TODO
    }

    private IfStatement(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, false, true, {
                type: AST.condition.type,
                operator: AST.condition.operator
            })

        this.connectParents(cfg, parents, [node])

        let count = cfg.edges.length
        const trueNodes = this[AST.trueBody.type](AST.trueBody, cfg, [node])
        // change first added edge
        cfg.edges[count].branchType = true

        if (AST.falseBody) {
            count = cfg.edges.length
            const falseNodes = this[AST.falseBody.type](AST.falseBody, cfg, [node])
            cfg.edges[count].branchType = false
            return [...trueNodes, ...falseNodes]
        } else {
            const falseNode: TempNode = this.createNode(cfg, AST.loc.end.line, false, false)

            cfg.edges.push({
                from: node.id,
                to: falseNode.id,
                branchType: false
            })

            return [...trueNodes, falseNode]
        }
    }

    private ForStatement(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, false, true, {
            type: AST.conditionExpression.type,
            operator: AST.conditionExpression.operator
        })
        // TODO For each problably not supported

        // TODO init expression
        // TODO condition expression
        // TODO loopExpression

        this.connectParents(cfg, parents, [node])

        const count = cfg.edges.length
        const trueNodes = this[AST.body.type](AST.body, cfg, [node])
        cfg.edges[count].branchType = true
        const falseNode: TempNode = this.createNode(cfg, AST.loc.end.line, false, false)

        cfg.edges.push({
            from: node.id,
            to: falseNode.id,
            branchType: false
        })

        this.connectParents(cfg, trueNodes, [node])

        return [falseNode]
    }

    private WhileStatement(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, false, true, {
            type: AST.condition.type,
            operator: AST.condition.operator
        })

        this.connectParents(cfg, parents, [node])

        const count = cfg.edges.length
        const trueNodes = this[AST.body.type](AST.body, cfg, [node])
        cfg.edges[count].branchType = true
        const falseNode: TempNode = this.createNode(cfg, AST.loc.end.line, false, false)

        cfg.edges.push({
            from: node.id,
            to: falseNode.id,
            branchType: false
        })

        this.connectParents(cfg, trueNodes, [node])

        return [falseNode]
    }

    private VariableDeclarationStatement(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, true, false)

        this.connectParents(cfg, parents, [node])

        return [node]
    }


    private ExpressionStatement(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, true, false)

        this.connectParents(cfg, parents, [node])

        return [node]
    }

    // TODO this is a terminating node sooo maybe not return anything? and then check in the parent node
    private ReturnStatement(AST: any, cfg: CFG, parents: TempNode[]): TempNode[] {
        const node: TempNode = this.createNode(cfg, AST.loc.start.line, true, false)

        this.connectParents(cfg, parents, [node])

        return []
    }
}
