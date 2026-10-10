// Loads the browser conversion scripts into one VM context, in the same order as index.html,
// so tests exercise exactly the code the page runs.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SCRIPTS = ["tokenizer", "mappings", "parser-utils", "hwp-parser", "latex-parser", "converter"];

const context = vm.createContext({});
for (const name of SCRIPTS) {
  const filename = path.join(__dirname, "..", "js", `${name}.js`);
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

module.exports = vm.runInContext("({ convertHwpToLatex, convertLatexToHwp })", context);
