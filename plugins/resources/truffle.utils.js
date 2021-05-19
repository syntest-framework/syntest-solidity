// import {getLogger} from "syntest-framework";

const TruffleProvider = require("@truffle/provider");
const recursive = require("recursive-readdir");
const globby = require("globby");
const path = require("path");
const { getLogger } = require("syntest-framework");

// =============================
// Truffle Specific Plugin Utils
// ==============================



module.exports = {
  getTestFilePaths: getTestFilePaths,
  setNetworkFrom: setNetworkFrom,
};
