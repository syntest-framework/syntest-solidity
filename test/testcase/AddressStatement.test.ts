import * as chai from "chai";
import {
  guessCWD,
  loadConfig,
  processConfig,
  setupLogger,
  setupOptions,
} from "syntest-framework";
import { AddressStatement } from "../../src";

const expect = chai.expect;

describe("AddressStatement", () => {
  before(async () => {
    await guessCWD(null);
    await setupOptions("", "");
    await loadConfig();
    await processConfig({}, "");
    await setupLogger();
  });

  it("should not have a null address", () => {
    const statement = AddressStatement.getRandom();

    expect(statement != null);
  });
});
