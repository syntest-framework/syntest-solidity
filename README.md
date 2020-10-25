# syntest-solidity
A tool to generate synthetic tests for the Solidity platform

# How to use
Since there is no npm package yet:

* Create a folder
* Clone the syntest-framework and syntest-solidity in the folder
    * `git clone git@github.com:syntest-framework/syntest-framework.git`
    * `git clone git@github.com:syntest-framework/syntest-solidity.git`

* Install dependencies for syntest-framework
    * `cd syntest-framework`
    * `npm install`
    * `npm run tsc:w`
* Install dependencies for syntest-solidity
    * `cd ../syntest-solidity`
    * `npm install`
    * `npm run tsc:w`
    
* Now you can create your own project and do the following
    * `cd ../your-project`
    * `npm install ../syntest-solidity`

# Features
- [x] Instrument the Contract Under Test (CUT) with function calls to record coverage.
- [x] Write test-case files that are runnable by truffle.js.

# Documentation

# Contributors

- Dimitri Stallenberg
- Mitchell Olsthoorn
- Annibale Panichella
