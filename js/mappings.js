// ═══════════════════════════════════════════════════════════
// Conversion Mappings & Helper Utilities
// ═══════════════════════════════════════════════════════════
// HWP command names follow Hancom's "한글 문서 파일 형식 - 수식" (revision 1.3).
function lookupOwn(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

// HWP reads a command written in all-lowercase or all-uppercase; mixed case stays plain letters.
function lookupCaseless(table, name) {
  const lower = name.toLowerCase();
  if (name !== lower && name !== name.toUpperCase()) return undefined;
  return lookupOwn(table, lower);
}

const GREEK_CAPITAL_TO_LATEX = {
  Alpha: "A", Beta: "B", Gamma: "\\Gamma", Delta: "\\Delta",
  Epsilon: "E", Zeta: "Z", Eta: "H", Theta: "\\Theta",
  Iota: "I", Kappa: "K", Lambda: "\\Lambda", Mu: "M",
  Nu: "N", Xi: "\\Xi", Omicron: "O", Pi: "\\Pi",
  Rho: "P", Sigma: "\\Sigma", Tau: "T", Upsilon: "\\Upsilon",
  Phi: "\\Phi", Chi: "X", Psi: "\\Psi", Omega: "\\Omega"
};

// HWP names whose meaning depends on the exact spelling.
const HWP_LITERAL_TO_LATEX = {
  Lim: "\\lim",
  "...": "\\ldots",
  // Greek lowercase
  alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma", delta: "\\delta",
  epsilon: "\\epsilon", zeta: "\\zeta", eta: "\\eta", theta: "\\theta",
  iota: "\\iota", kappa: "\\kappa", lambda: "\\lambda", mu: "\\mu",
  nu: "\\nu", xi: "\\xi", omicron: "o", pi: "\\pi",
  rho: "\\rho", sigma: "\\sigma", tau: "\\tau", upsilon: "\\upsilon",
  phi: "\\phi", chi: "\\chi", psi: "\\psi", omega: "\\omega",
  // Greek variants
  varepsilon: "\\varepsilon", vartheta: "\\vartheta", varpi: "\\varpi",
  varrho: "\\varrho", varsigma: "\\varsigma", varphi: "\\varphi",
  varupsilon: "\\Upsilon",
  // Arrows: lowercase names are single arrows, uppercase names are double arrows
  larrow: "\\leftarrow", rarrow: "\\rightarrow", lrarrow: "\\leftrightarrow",
  uparrow: "\\uparrow", downarrow: "\\downarrow", udarrow: "\\updownarrow",
  LARROW: "\\Leftarrow", RARROW: "\\Rightarrow", LRARROW: "\\Leftrightarrow",
  UPARROW: "\\Uparrow", DOWNARROW: "\\Downarrow", UDARROW: "\\Updownarrow",
  // Bars: vert is a single bar, VERT a double bar
  vert: "\\vert", VERT: "\\Vert",
  // LaTeX-style spellings, accepted as written
  to: "\\to", rightarrow: "\\rightarrow", leftarrow: "\\leftarrow",
  leftrightarrow: "\\leftrightarrow", updownarrow: "\\updownarrow",
  Rightarrow: "\\Rightarrow", Leftarrow: "\\Leftarrow", Leftrightarrow: "\\Leftrightarrow",
  Uparrow: "\\Uparrow", Downarrow: "\\Downarrow", Updownarrow: "\\Updownarrow",
  infinity: "\\infty", infty: "\\infty", exists: "\\exists", ni: "\\ni",
  parallel: "\\parallel", perp: "\\perp", mid: "\\mid", nmid: "\\nmid",
  ll: "\\ll", gg: "\\gg", varnothing: "\\varnothing",
  langle: "\\langle", rangle: "\\rangle",
  Re: "\\Re", Im: "\\Im",
  // Symbol operators
  "->": "\\to", "<-": "\\leftarrow", "<->": "\\leftrightarrow", "=>": "\\Rightarrow",
  "<=": "\\leq", ">=": "\\geq", "<>": "\\neq", "!=": "\\neq", "==": "\\equiv",
  "<<": "\\ll", ">>": "\\gg", "<<<": "\\lll", ">>>": "\\ggg",
  "+-": "\\pm", "-+": "\\mp",
  // Spacing (~ is a normal space in both; ` is HWP's quarter space)
  "`": "\\,"
};

// "Gamma" and "GAMMA" both give the capital letter.
for (const [name, latex] of Object.entries(GREEK_CAPITAL_TO_LATEX)) {
  HWP_LITERAL_TO_LATEX[name] = latex;
  HWP_LITERAL_TO_LATEX[name.toUpperCase()] = latex;
}

// HWP names read in either case (keys are lowercase).
const HWP_CASELESS_LITERAL_TO_LATEX = {
  lim: "\\lim", not: "\\not", bigg: "\\bigg",
  inf: "\\infty", prime: "\\prime",
  // Sums and sets (UNION/INTER with limits become \bigcup/\bigcap, see HWP_LIMIT_FORM_TO_LATEX)
  prod: "\\prod", smallprod: "\\prod", coprod: "\\coprod", smcoprod: "\\coprod",
  union: "\\cup", smallunion: "\\cup", cup: "\\cup", bigcup: "\\bigcup",
  inter: "\\cap", smallinter: "\\cap", cap: "\\cap", bigcap: "\\bigcap",
  sqcup: "\\sqcup", bigsqcup: "\\bigsqcup", sqcap: "\\sqcap", bigsqcap: "\\sqcap",
  uplus: "\\uplus", biguplus: "\\biguplus",
  oplus: "\\oplus", bigoplus: "\\bigoplus", ominus: "\\ominus", bigominus: "\\ominus",
  otimes: "\\otimes", bigotimes: "\\bigotimes", odot: "\\odot", bigodot: "\\bigodot",
  oslash: "\\oslash", odiv: "\\oslash", bigodiv: "\\oslash",
  vee: "\\vee", lor: "\\lor", bigvee: "\\bigvee",
  wedge: "\\wedge", land: "\\land", bigwedge: "\\bigwedge",
  subset: "\\subset", supset: "\\supset", superset: "\\supset",
  subseteq: "\\subseteq", supseteq: "\\supseteq",
  sqsubset: "\\sqsubset", sqsupset: "\\sqsupset",
  sqsubseteq: "\\sqsubseteq", sqsupseteq: "\\sqsupseteq",
  "in": "\\in", notin: "\\notin", owns: "\\ni",
  leq: "\\leq", geq: "\\geq", neq: "\\neq", lll: "\\lll", ggg: "\\ggg",
  prec: "\\prec", succ: "\\succ",
  // Operators and logic
  plusminus: "\\pm", minusplus: "\\mp", div: "\\div", divide: "\\div",
  cdot: "\\cdot", circ: "\\circ", bullet: "\\bullet", ast: "\\ast",
  star: "\\bigstar", bigcirc: "\\bigcirc", diamond: "\\diamond",
  deg: "^{\\circ}", centigrade: "^{\\circ}\\mathrm{C}", fahrenheit: "^{\\circ}\\mathrm{F}",
  emptyset: "\\emptyset", therefore: "\\therefore", because: "\\because",
  identical: "::", exist: "\\exists", forall: "\\forall",
  doteq: "\\doteq", image: "\\fallingdotseq", reimage: "\\risingdotseq",
  sim: "\\sim", approx: "\\approx", simeq: "\\simeq", cong: "\\cong",
  equiv: "\\equiv", asymp: "\\asymp", iso: "\\Bumpeq", propto: "\\propto",
  dsum: "\\dotplus", xor: "\\veebar", lnot: "\\lnot",
  partial: "\\partial", nabla: "\\nabla", triangled: "\\nabla",
  dagger: "\\dagger", ddagger: "\\ddagger",
  // Letter-like symbols
  aleph: "\\aleph", hbar: "\\hbar", imath: "\\imath", jmath: "\\jmath",
  ell: "\\ell", liter: "\\ell", wp: "\\wp", imag: "\\Im",
  ohm: "\\Omega", mho: "\\mho", angstrom: "\\mathring{\\mathrm{A}}",
  laplace: "\\mathcal{L}",
  // Arrows
  nwarrow: "\\nwarrow", nearrow: "\\nearrow", swarrow: "\\swarrow", searrow: "\\searrow",
  hookleft: "\\hookleftarrow", hookright: "\\hookrightarrow", mapsto: "\\mapsto",
  // Dots and geometry
  cdots: "\\cdots", ldots: "\\ldots", vdots: "\\vdots", ddots: "\\ddots",
  triangle: "\\triangle", angle: "\\angle",
  msangle: "\\measuredangle", sangle: "\\sphericalangle", rtangle: "\\text{⊾}",
  vdash: "\\vdash", hleft: "\\dashv", dashv: "\\dashv",
  bot: "\\bot", top: "\\top", models: "\\models",
  lslant: "\\diagup", rslant: "\\diagdown",
  // Symbols LaTeX has no command for
  att: "\\text{※}", hund: "\\text{‰}", thou: "\\text{‱}",
  well: "\\sharp", base: "\\text{⌂}", benzene: "\\text{⌬}",
  // Delimiters
  lbrace: "\\lbrace", rbrace: "\\rbrace",
  lceil: "\\lceil", rceil: "\\rceil", lfloor: "\\lfloor", rfloor: "\\rfloor"
};

// UNION and INTER are plain binary operators until they carry limits.
const HWP_LIMIT_FORM_TO_LATEX = { union: "\\bigcup", inter: "\\bigcap" };

// LaTeX names that HWP spells differently. Every other name is shared: HWP reads it as written.
// (Relation names such as \to and \leq are in LATEX_RELATION_NAMES.)
const LATEX_LITERAL_TO_HWP = {
  // Arrows
  updownarrow: "udarrow",
  Uparrow: "UPARROW", Downarrow: "DOWNARROW", Updownarrow: "UDARROW",
  hookleftarrow: "hookleft", hookrightarrow: "hookright",
  // Sums and sets
  infty: "inf", infinity: "inf",
  bigcup: "UNION", cup: "SMALLUNION", bigcap: "INTER", cap: "SMALLINTER",
  prod: "PROD", ni: "owns",
  // Dots
  ldots: "ldots", dots: "ldots",
  // Plus/minus
  pm: "+-", mp: "-+",
  // Symbols
  exists: "exist", varnothing: "emptyset", neg: "lnot", perp: "bot",
  veebar: "xor", dotplus: "dsum", Bumpeq: "iso",
  fallingdotseq: "image", risingdotseq: "reimage",
  measuredangle: "msangle", sphericalangle: "sangle",
  bigstar: "star", sharp: "well", degree: "DEG",
  Im: "IMAG", AA: "ANGSTROM",
  // Bars
  mid: "vert", lvert: "vert", rvert: "vert",
  Vert: "VERT", lVert: "VERT", rVert: "VERT",
  // Spacing: ` is HWP's quarter space, ~ a full space
  thinspace: "`", medspace: "~", thickspace: "~", space: "~", enspace: "~",
  quad: "~~", qquad: "~~~~"
};

for (const name of Object.keys(GREEK_CAPITAL_TO_LATEX)) {
  LATEX_LITERAL_TO_HWP[name] = name.toUpperCase();
}

// Relations are parsed at their own precedence level and printed with spaces around them.
// "<==" and "<=>" are internal names for the double arrows (HWP has no such symbol sequences).
const RELATION_OPERATORS = new Set([
  "=", "<", ">", "<=", ">=", "<>", "!=", "==", "<<", ">>", "<<<", ">>>",
  "->", "<-", "<->", "=>", "<==", "<=>"
]);

const BINARY_OP_TO_LATEX = {
  times: "\\times",
  "#": "\\\\",
  "->": "\\to",
  "<-": "\\leftarrow",
  "<->": "\\leftrightarrow",
  "=>": "\\Rightarrow",
  "<==": "\\Leftarrow",
  "<=>": "\\Leftrightarrow",
  "<=": "\\leq",
  ">=": "\\geq",
  "<>": "\\neq",
  "!=": "\\neq",
  "==": "\\equiv",
  "<<": "\\ll",
  ">>": "\\gg",
  "<<<": "\\lll",
  ">>>": "\\ggg",
  "+-": "\\pm",
  "-+": "\\mp"
};

// Operators whose HWP spelling differs from the internal name.
const OPERATOR_TO_HWP = {
  "<=": "LEQ", ">=": "GEQ", "<>": "!=",
  "=>": "RARROW", "<==": "LARROW", "<=>": "LRARROW"
};

// HWP relation names, exact spelling.
const HWP_RELATION_NAMES = {
  rarrow: "->", larrow: "<-", lrarrow: "<->",
  RARROW: "=>", LARROW: "<==", LRARROW: "<=>",
  to: "->", rightarrow: "->", leftarrow: "<-", leftrightarrow: "<->",
  Rightarrow: "=>", Leftarrow: "<==", Leftrightarrow: "<=>"
};

// HWP relation names read in either case (keys are lowercase).
const HWP_CASELESS_RELATION_NAMES = { leq: "<=", geq: ">=", neq: "!=", lll: "<<<", ggg: ">>>" };

const LATEX_RELATION_NAMES = {
  to: "->", rightarrow: "->", longrightarrow: "->",
  gets: "<-", leftarrow: "<-", longleftarrow: "<-",
  leftrightarrow: "<->", longleftrightarrow: "<->",
  Rightarrow: "=>", implies: "=>", Longrightarrow: "=>",
  Leftarrow: "<==", impliedby: "<==", Longleftarrow: "<==",
  Leftrightarrow: "<=>", iff: "<=>", Longleftrightarrow: "<=>",
  leq: "<=", le: "<=", geq: ">=", ge: ">=", neq: "!=", ne: "!=",
  ll: "<<", gg: ">>", lll: "<<<", ggg: ">>>"
};

const DECORATION_TO_LATEX = {
  acute: "\\acute",
  grave: "\\grave",
  dot: "\\dot",
  ddot: "\\ddot",
  bar: "\\bar",
  vec: "\\vec",
  dyad: "\\overleftrightarrow",
  under: "\\underline",
  hat: "\\hat",
  arch: "\\overparen",
  check: "\\check",
  tilde: "\\tilde",
  overline: "\\overline",
  underline: "\\underline",
  box: "\\boxed"
};

// HWP stretches these over everything beneath them; LaTeX needs the wide command for that.
const WIDE_DECORATION_TO_LATEX = {
  bar: "\\overline",
  vec: "\\overrightarrow",
  hat: "\\widehat",
  tilde: "\\widetilde"
};

const LATEX_DECORATION_TO_HWP = {
  acute: "acute",
  grave: "grave",
  dot: "dot",
  ddot: "ddot",
  bar: "bar",
  overline: "bar",
  vec: "vec",
  overrightarrow: "vec",
  dyad: "dyad",
  overleftrightarrow: "dyad",
  under: "under",
  underline: "under",
  hat: "hat",
  widehat: "hat",
  arch: "arch",
  overparen: "arch",
  check: "check",
  tilde: "tilde",
  widetilde: "tilde",
  boxed: "box"
};

// Names HWP always sets upright (spec 1.1.3), exactly as spelled.
const HWP_FUNCTIONS = new Set([
  "sin","cos","coth","log","tan","cot","ln","lg","sec","cosec",
  "max","min","csc","arcsin","arccos","arctan","arc","asin","acos","atan",
  "exp","Exp","det","gcd","lcm","sinh","cosh","tanh","mod",
  "if","for","and","or","hom","ker","deg","arg","dim","Pr",
  "liminf","limsup"
]);

// In HWP "inf" is the infinity sign and "sup" starts a superscript, so they are functions only in LaTeX.
const LATEX_FUNCTIONS = new Set([...HWP_FUNCTIONS, "inf", "sup", "lim", "bmod"]);

// Function names LaTeX defines as commands; the rest go through \operatorname.
const LATEX_NATIVE_FUNCTIONS = new Set([
  "sin","cos","tan","cot","sec","csc","arcsin","arccos","arctan",
  "sinh","cosh","tanh","coth","log","ln","lg","exp",
  "det","gcd","max","min","hom","ker","deg","arg","dim","Pr",
  "lim","liminf","limsup","inf","sup"
]);

// LaTeX function names that mean something else in HWP and so are quoted or renamed.
const LATEX_FUNCTION_TO_HWP = { inf: "\"inf\"", sup: "\"sup\"", bmod: "mod" };

const HWP_TIGHT_FUNCTIONS = new Set([
  "sin","cos","tan","cot","sec","csc","cosec",
  "arcsin","arccos","arctan",
  "sinh","cosh","tanh","coth",
  "log","ln","lg","exp","Exp"
]);

const HWP_SPACED_LITERAL_TOKENS = new Set([
  "cdot","cdots","...","vdots","ddots"
]);

const STYLE_TO_LATEX = {
  rm: "\\mathrm",
  it: "\\mathit",
  bold: "\\boldsymbol",
  rmbold: "\\mathbf"
};

const LATEX_STYLE_TO_HWP = {
  mathrm: "rm",
  mathit: "it",
  boldsymbol: "bold",
  mathbf: "rmbold"
};

// Integrals: HWP keyword -> LaTeX command, and LaTeX command -> HWP command.
const HWP_INTEGRAL_KEYWORDS = {
  INT: "int", OINT: "oint", DINT: "iint", TINT: "iiint", ODINT: "oiint", OTINT: "oiiint",
  SMALLINT: "int", SMALLOINT: "oint"
};

const LATEX_INTEGRAL_TO_HWP = {
  int: "int", oint: "oint", iint: "dint", iiint: "tint", oiint: "odint", oiiint: "otint"
};

// Delimiters after LEFT/RIGHT, stored as the LaTeX delimiter they stand for.
const HWP_NAMED_DELIMITERS = {
  "<": "\\langle", ">": "\\rangle", vert: "|", VERT: "\\|",
  "⌈": "\\lceil", "⌉": "\\rceil", "⌊": "\\lfloor", "⌋": "\\rfloor",
  "∥": "\\|", "‖": "\\|", "〈": "\\langle", "〉": "\\rangle", "⟨": "\\langle", "⟩": "\\rangle"
};

const HWP_CASELESS_NAMED_DELIMITERS = {
  lbrace: "{", rbrace: "}", langle: "\\langle", rangle: "\\rangle",
  lceil: "\\lceil", rceil: "\\rceil", lfloor: "\\lfloor", rfloor: "\\rfloor"
};

const LATEX_NAMED_DELIMITERS = {
  "<": "\\langle", ">": "\\rangle", langle: "\\langle", rangle: "\\rangle",
  lceil: "\\lceil", rceil: "\\rceil", lfloor: "\\lfloor", rfloor: "\\rfloor",
  lbrace: "\\{", rbrace: "\\}",
  vert: "|", lvert: "|", rvert: "|", Vert: "\\|", lVert: "\\|", rVert: "\\|"
};

const LATEX_DELIMITER_TO_HWP = {
  "\\{": "{", "\\}": "}", "\\langle": "<", "\\rangle": ">",
  "\\lceil": "lceil", "\\rceil": "rceil", "\\lfloor": "lfloor", "\\rfloor": "rfloor",
  "\\|": "VERT"
};

// LaTeX text sizes as a percentage of the normal size, for HWP's "scale N".
const LATEX_SIZE_STEPS = [
  [50, "\\tiny"], [70, "\\scriptsize"], [80, "\\footnotesize"], [90, "\\small"], [100, ""],
  [120, "\\large"], [144, "\\Large"], [173, "\\LARGE"], [207, "\\huge"], [249, "\\Huge"]
];

const LATEX_NAMED_COLORS = {
  black: [0, 0, 0], white: [255, 255, 255], gray: [128, 128, 128],
  red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255],
  cyan: [0, 255, 255], magenta: [255, 0, 255], yellow: [255, 255, 0],
  orange: [255, 165, 0], purple: [128, 0, 128], brown: [165, 42, 42], pink: [255, 192, 203]
};

function normalizeLatexOperator(value) {
  return lookupOwn(LATEX_RELATION_NAMES, value) || null;
}

function normalizeHwpOperator(value) {
  if (RELATION_OPERATORS.has(value)) return value;
  return lookupOwn(HWP_RELATION_NAMES, value) || lookupCaseless(HWP_CASELESS_RELATION_NAMES, value) || value;
}

function operatorToLatex(operator) {
  return lookupOwn(BINARY_OP_TO_LATEX, operator) || operator;
}

function operatorToHwp(operator) {
  return lookupOwn(OPERATOR_TO_HWP, operator) || operator;
}

function literalToLatex(value) {
  return lookupOwn(HWP_LITERAL_TO_LATEX, value) || lookupCaseless(HWP_CASELESS_LITERAL_TO_LATEX, value) || value;
}

function literalToHwp(value) {
  const literal = lookupOwn(LATEX_LITERAL_TO_HWP, value);
  if (literal) return literal;
  const relation = lookupOwn(LATEX_RELATION_NAMES, value);
  return relation ? operatorToHwp(relation) : value;
}

function isFunctionLikeValue(value) {
  return HWP_FUNCTIONS.has(value) || ["LIM", "lim", "Lim", "PROD", "prod"].includes(value);
}

function isFunctionLikeNode(node) {
  if (!node) return false;
  if (node.type === "FunctionName") return true;
  if (node.type === "Literal") return isFunctionLikeValue(node.value);
  if (node.type === "Subscript" || node.type === "Superscript") return isFunctionLikeNode(node.base);
  return false;
}

function getFunctionLikeName(node) {
  if (!node) return null;
  if (node.type === "FunctionName") return node.value;
  if (node.type === "Literal" && isFunctionLikeValue(node.value)) return node.value;
  if (node.type === "Subscript" || node.type === "Superscript") return getFunctionLikeName(node.base);
  return null;
}

function functionNameToLatex(name) {
  if (name === "mod" || name === "bmod") return "\\bmod";
  return LATEX_NATIVE_FUNCTIONS.has(name) ? `\\${name}` : `\\operatorname{${name}}`;
}

function functionNameToHwp(name) {
  return lookupOwn(LATEX_FUNCTION_TO_HWP, name) || name;
}

function isEmptyNode(node) {
  return !node || (node.type === "Literal" && node.value === "");
}

// A lone letter or symbol, as opposed to something a decoration has to stretch over.
function isSingleSymbolNode(node) {
  return node.type === "Literal" && (node.value.length <= 1 || literalToLatex(node.value) !== node.value);
}

function decorationToLatex(decoType, child) {
  const wide = lookupOwn(WIDE_DECORATION_TO_LATEX, decoType);
  if (wide && !isSingleSymbolNode(child)) return wide;
  return lookupOwn(DECORATION_TO_LATEX, decoType) || `\\${decoType}`;
}

function scaleToLatexSize(percent) {
  let best = LATEX_SIZE_STEPS[0];
  for (const step of LATEX_SIZE_STEPS) {
    if (Math.abs(step[0] - percent) < Math.abs(best[0] - percent)) best = step;
  }
  return best[1];
}

function rgbToLatexColor(rgb) {
  return "#" + rgb.map(channel => channel.toString(16).padStart(2, "0").toUpperCase()).join("");
}

function clampColorChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// Reads a LaTeX colour (name, #hex, or a [model]{spec} pair) as [r, g, b]; null when unknown.
function parseLatexColor(model, spec) {
  const parts = spec.split(",").map(Number);
  const hasThreeNumbers = parts.length === 3 && parts.every(Number.isFinite);
  if (model === "RGB") return hasThreeNumbers ? parts.map(clampColorChannel) : null;
  if (model === "rgb") return hasThreeNumbers ? parts.map(part => clampColorChannel(part * 255)) : null;
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(spec);
  if (hex && (model === "HTML" || spec.startsWith("#"))) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
    return [0, 2, 4].map(offset => parseInt(digits.slice(offset, offset + 2), 16));
  }
  return lookupOwn(LATEX_NAMED_COLORS, spec.toLowerCase()) || null;
}

function hwpNamedDelimiter(value) {
  return lookupOwn(HWP_NAMED_DELIMITERS, value) || lookupCaseless(HWP_CASELESS_NAMED_DELIMITERS, value) || "";
}

function flattenImplicitFactors(node) {
  if (node && node.type === "BinaryOp" && node.operator === "") {
    return [...flattenImplicitFactors(node.left), ...flattenImplicitFactors(node.right)];
  }
  return [node];
}

// True when gluing two rendered pieces would merge them into one name,
// e.g. "\pi" + "r" -> "\pir" in LaTeX, or "x" + "in" -> "xin" in HWP.
function needsTokenBoundary(previousText, currentText, target) {
  if (!/^[A-Za-z]/.test(currentText)) return false;
  return target === "latex" ? /\\[A-Za-z]+$/.test(previousText) : /[A-Za-z]$/.test(previousText);
}

function joinLatex(previousText, currentText) {
  return previousText + (needsTokenBoundary(previousText, currentText, "latex") ? " " : "") + currentText;
}

function implicitJoinSeparator(previousNode, currentNode, target, previousText, currentText) {
  const previousFunctionName = getFunctionLikeName(previousNode);
  const currentFunctionName = getFunctionLikeName(currentNode);
  const previousLiteralValue = previousNode && previousNode.type === "Literal" ? literalToHwp(previousNode.value) : "";
  const currentLiteralValue = currentNode && currentNode.type === "Literal" ? literalToHwp(currentNode.value) : "";

  if (target === "hwp") {
    const previousNeedsSpacing = HWP_SPACED_LITERAL_TOKENS.has(previousLiteralValue) || /[^A-Za-z0-9_]/.test(previousLiteralValue);
    const currentNeedsSpacing = HWP_SPACED_LITERAL_TOKENS.has(currentLiteralValue) || /[^A-Za-z0-9_]/.test(currentLiteralValue);
    if (previousNeedsSpacing || currentNeedsSpacing) return " ";
  }

  if (currentFunctionName) return " ";
  if (!previousFunctionName) return needsTokenBoundary(previousText, currentText, target) ? " " : "";
  if (currentNode && currentNode.type === "Bracket") return "";
  if (target === "latex") return " ";
  return HWP_TIGHT_FUNCTIONS.has(previousFunctionName) ? "" : " ";
}

function formatImplicitSequence(node, renderFactor, target) {
  const factors = flattenImplicitFactors(node);
  let rendered = "";
  for (let i = 0; i < factors.length; i++) {
    const current = renderFactor(factors[i]);
    if (i > 0) rendered += implicitJoinSeparator(factors[i - 1], factors[i], target, rendered, current);
    rendered += current;
  }
  return rendered;
}

// An operand HWP must read as one term: anything longer than a single item goes in braces.
function wrapHwpOperand(node) {
  if (!node) return "";
  const rendered = toHwpEqn(node);
  if (["Literal", "FunctionName", "Text", "Bracket", "Styled", "Subscript", "Superscript"].includes(node.type)) return rendered;
  return `{${rendered}}`;
}

function formatStyledForHwp(style, childNode) {
  if (style === "rm" || style === "it") {
    // A font switch runs to the end of its group, so it gets a group of its own.
    const inner = childNode && childNode.type === "Bracket" && childNode.leftDelim === "{" ? childNode.content : childNode;
    return `{${style} ${inner ? toHwpEqn(inner) : ""}}`;
  }
  const child = wrapHwpOperand(childNode);
  return child.startsWith("{") ? `${style}${child}` : `${style} ${child}`;
}

function makeHwpNameNode(value) {
  return { type: HWP_FUNCTIONS.has(value) ? "FunctionName" : "Literal", value };
}

function makeLatexNameNode(value) {
  return { type: LATEX_FUNCTIONS.has(value) ? "FunctionName" : "Literal", value };
}

function isHwpMatrixEnvName(envName) {
  return ["matrix", "pmatrix", "bmatrix", "dmatrix"].includes(envName);
}

function hwpColumnKeywordToAlign(keyword) {
  return keyword === "LCOL" ? "l" : keyword === "RCOL" ? "r" : "c";
}

function alignToHwpColumnKeyword(align) {
  return align === "l" ? "lcol" : align === "r" ? "rcol" : "col";
}

function sanitizeArrayAlignSpec(alignSpec) {
  const cleaned = (alignSpec || "").replace(/[^lcr]/g, "");
  return cleaned || null;
}
