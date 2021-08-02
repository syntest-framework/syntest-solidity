// my-reporter.js

'use strict';

const Mocha = require('mocha');
const {
    EVENT_RUN_BEGIN,
    EVENT_RUN_END,
    EVENT_TEST_FAIL,
    EVENT_TEST_PASS,
    EVENT_SUITE_BEGIN,
    EVENT_SUITE_END
} = Mocha.Runner.constants;

export default class SilentMochaReporter {
    private _indents: number

    constructor(runner) {
        this._indents = 0;
        const stats = runner.stats;

        runner
            .once(EVENT_RUN_BEGIN, () => {})
            .on(EVENT_SUITE_BEGIN, () => {})
            .on(EVENT_SUITE_END, () => {})
            .on(EVENT_TEST_PASS, test => {})
            .on(EVENT_TEST_FAIL, (test, err) => {
                // console.log(test)
                // console.log(err.stack)
                // console.log(typeof err.stack)
                // console.log(Object.getOwnPropertyNames(err.stack))
                // // console.log(
                // //     `${this.indent()}fail: ${test.fullTitle()} - error: ${err.message}`
                // // );
            })
            .once(EVENT_RUN_END, () => {});
    }
}
