import {SolidityLauncher} from "./SolidityLauncher";
import TruffleConfig = require("@truffle/config");

const launcher = new SolidityLauncher()
launcher.run(TruffleConfig.default())