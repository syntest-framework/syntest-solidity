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

    versions (truffle: string, ganache: string, syntest: string): string {
        return `${this.ct} ${chalk.bold("truffle")}:           v${truffle}\n` +
        `${this.ct} ${chalk.bold("ganache-core")}:      ${ganache}\n` +
        `${this.ct} ${chalk.bold("solidity-coverage")}: v${syntest}`
    }

    skipFiles (files: string[]): string {
        return `\n${chalk.bold("Coverage skipped for:")}` +
            `\n${chalk.bold("=====================")}\n` +
            files.map((t) => `${this.ds} ${chalk.grey(t)}`).join("\n")
    }

    testTarget (targetFile: string): string {
        return `Testing target: ${targetFile}`
    }
}