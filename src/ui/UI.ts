export default class UI {
  private _silent: boolean;
  private _verbose: boolean;
  constructor(silent = false, verbose = false) {
    this._silent = silent;
    this._verbose = verbose;
  }

  get silent(): boolean {
    return this._silent;
  }

  get verbose(): boolean {
    return this._verbose;
  }
}
