"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UI {
    constructor(silent = false, verbose = false) {
        this._silent = silent;
        this._verbose = verbose;
    }
    get silent() {
        return this._silent;
    }
    get verbose() {
        return this._verbose;
    }
}
exports.default = UI;
//# sourceMappingURL=UI.js.map