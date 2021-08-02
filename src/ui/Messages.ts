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

    version (syntestSolidity: string): string {
        return `\n${this.ct} ${chalk.bold("syntest-solidity")}: v${syntestSolidity}`
    }

    versions (truffle: string, ganache: string, syntest: string): string {
        return `\n${this.ct} ${chalk.bold("truffle")}:           v${truffle}\n` +
            `${this.ct} ${chalk.bold("ganache-core")}:      ${ganache}\n` +
            `${this.ct} ${chalk.bold("solidity-coverage")}: v${syntest}`
    }

    skipFiles (files: string[]): string {
        return `\n${chalk.bold("Excluded:")}` +
            `\n${chalk.bold("=====================")}\n` +
            files.map((t) => `${this.ds} ${chalk.grey(t)}`).join("\n") +
            `\n${chalk.bold("=====================")}`
    }

    targets (targets: string[]): string {
        return `${chalk.bold("Included:")}` +
            `\n${chalk.bold("=====================")}\n` +
            targets
            .map((t) => `${this.ct} ${t}`)
            .join("\n") +
            `\n${chalk.bold("=====================")}`

    }

    singleProperty (property: string, value: string): string {
        return chalk.bold(`${property}: `) + `${value}`
    }

    propertySet(setName: string, props: [string, string][]): string {
        return `\n${chalk.bold(setName)}: \n` +
            props
                .map((p) => `${this.ct} ${p[0]}: ${p[1]}`)
                .join('\n')
    }

    header(header: string): string {
        return '\n' + chalk.green(chalk.bold(`${header.toUpperCase()}:`)) + '\n'
    }
}
