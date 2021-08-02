const chalk = require("chalk");
const figlet = require('figlet')

export default class Messages {

    private ct: string = chalk.bold.green(">");
    private ds: string = chalk.bold.yellow(">");

    asciiArt (text: string): string {
        return chalk.yellow(
            figlet.textSync(text, { horizontalLayout: 'full' })
        )
    }

    network (id: string, port: string, network: string): string {
        return `\n${chalk.bold("Network Info")}` +
        `\n${chalk.bold("============")}\n` +
        `${this.ct} ${chalk.bold("id")}:      ${id}\n` +
        `${this.ct} ${chalk.bold("port")}:    ${port}\n` +
        `${this.ct} ${chalk.bold("network")}: ${network}\n`
    }

    version (syntestSolidity: string): string {
        return `${this.ct} ${chalk.bold("syntest-solidity")}:           v${syntestSolidity}`
    }

    versions (truffle: string, ganache: string, syntest: string): string {
        return `${this.ct} ${chalk.bold("truffle")}:           v${truffle}\n` +
            `${this.ct} ${chalk.bold("ganache-core")}:      ${ganache}\n` +
            `${this.ct} ${chalk.bold("solidity-coverage")}: v${syntest}`
    }

    skipFiles (files: string[]): string {
        return `${chalk.bold("Coverage skipped for:")}` +
            `\n${chalk.bold("=====================")}\n` +
            files.map((t) => `${this.ds} ${chalk.grey(t)}`).join("\n") +
            `\n${chalk.bold("=====================")}\n`
    }

    testTarget (targetFile: string): string {
        return `Testing target: ${targetFile}`
    }

    targets (targets: string[]): string {
        return `${chalk.bold("Included for testing:")}` +
            `\n${chalk.bold("=====================")}\n` +
            targets
            .map((t) => `${this.ct} ${t}`)
            .join("\n") +
            `\n${chalk.bold("=====================")}\n`

    }

    seed (seed: string): string {
        return `${chalk.bold('Seed:')} ${seed}\n`
    }

    budget (iterationBudget: string, searchTime: string, totalTime: string): string {
        return `${chalk.bold('Budgets: ')}\n` +
            `${this.ct} Iteration Budget: ${iterationBudget} generations\n` +
            `${this.ct} Search Time: ${searchTime} seconds\n` +
            `${this.ct} Total Time: ${totalTime} seconds\n`
    }

    algorithm (algorithm: string): string {
        return `${chalk.bold('Algorithm:')} ${algorithm}\n`
    }

    propertySet(setName: string, props: [string, string][]): string {
        return `${chalk.bold(setName)}: \n` +
            props
                .map((p) => `${this.ct} ${p[0]}: ${p[1]}`)
                .join('\n') + '\n'
    }
}
