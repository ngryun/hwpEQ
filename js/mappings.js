// ═══════════════════════════════════════════════════════════
// Conversion Mappings & Helper Utilities
// ═══════════════════════════════════════════════════════════
const HWP_LITERAL_TO_LATEX = {
  LIM: "\\lim", lim: "\\lim", Lim: "\\lim",
  PROD: "\\prod", prod: "\\prod",
  UNION: "\\bigcup", SMALLUNION: "\\cup",
  INTER: "\\bigcap", SMALLINTER: "\\cap",
  NOT: "\\not", not: "\\not",
  BIGG: "\\bigg", bigg: "\\bigg",
  inf: "\\infty", infinity: "\\infty",
  cdot: "\\cdot", cdots: "\\cdots", "...": "\\ldots",
  // Greek lowercase (complete)
  alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma", delta: "\\delta",
  epsilon: "\\epsilon", zeta: "\\zeta", eta: "\\eta", theta: "\\theta",
  iota: "\\iota", kappa: "\\kappa", lambda: "\\lambda", mu: "\\mu",
  nu: "\\nu", xi: "\\xi", omicron: "o", pi: "\\pi",
  rho: "\\rho", sigma: "\\sigma", tau: "\\tau", upsilon: "\\upsilon",
  phi: "\\phi", chi: "\\chi", psi: "\\psi", omega: "\\omega",
  // Greek uppercase
  ALPHA: "A", BETA: "B", GAMMA: "\\Gamma", DELTA: "\\Delta",
  EPSILON: "E", ZETA: "Z", ETA: "H", THETA: "\\Theta",
  IOTA: "I", KAPPA: "K", LAMBDA: "\\Lambda", MU: "M",
  NU: "N", XI: "\\Xi", PI: "\\Pi",
  RHO: "P", SIGMA: "\\Sigma", TAU: "T", UPSILON: "\\Upsilon",
  PHI: "\\Phi", CHI: "X", PSI: "\\Psi", OMEGA: "\\Omega",
  // Greek variants
  varepsilon: "\\varepsilon", vartheta: "\\vartheta", varpi: "\\varpi",
  varrho: "\\varrho", varsigma: "\\varsigma", varphi: "\\varphi",
  // Arrows
  to: "\\to", rightarrow: "\\rightarrow", leftarrow: "\\leftarrow",
  leftrightarrow: "\\leftrightarrow",
  uparrow: "\\uparrow", downarrow: "\\downarrow",
  Uparrow: "\\Uparrow", Downarrow: "\\Downarrow",
  Leftrightarrow: "\\Leftrightarrow", Leftarrow: "\\Leftarrow",
  mapsto: "\\mapsto",
  "->": "\\to", "<-": "\\leftarrow", "<->": "\\leftrightarrow",
  "<=": "\\leq", ">=": "\\geq", "<>": "\\neq", "=>": "\\Rightarrow",
  LEQ: "\\leq", GEQ: "\\geq",
  // Relations & operators
  approx: "\\approx", sim: "\\sim", simeq: "\\simeq",
  equiv: "\\equiv", cong: "\\cong",
  prec: "\\prec", succ: "\\succ",
  "in": "\\in", notin: "\\notin", ni: "\\ni",
  subset: "\\subset", supset: "\\supset",
  subseteq: "\\subseteq", supseteq: "\\supseteq",
  parallel: "\\parallel", perp: "\\perp",
  mid: "\\mid", nmid: "\\nmid",
  ll: "\\ll", gg: "\\gg",
  propto: "\\propto",
  // Special symbols
  partial: "\\partial", nabla: "\\nabla",
  forall: "\\forall", exists: "\\exists",
  emptyset: "\\emptyset", varnothing: "\\varnothing",
  angle: "\\angle", triangle: "\\triangle",
  star: "\\star", circ: "\\circ", bullet: "\\bullet",
  oplus: "\\oplus", ominus: "\\ominus", otimes: "\\otimes", odot: "\\odot",
  dagger: "\\dagger", ddagger: "\\ddagger",
  aleph: "\\aleph",
  hbar: "\\hbar",
  ell: "\\ell",
  wp: "\\wp",
  Re: "\\Re", Im: "\\Im",
  prime: "\\prime",
  // Big operators
  coprod: "\\coprod",
  bigvee: "\\bigvee", bigwedge: "\\bigwedge",
  bigoplus: "\\bigoplus", bigotimes: "\\bigotimes",
  bigsqcup: "\\bigsqcup",
  // Delimiters
  langle: "\\langle", rangle: "\\rangle",
  lfloor: "\\lfloor", rfloor: "\\rfloor",
  lceil: "\\lceil", rceil: "\\rceil",
  // Logic
  land: "\\land", lor: "\\lor", lnot: "\\lnot",
  wedge: "\\wedge", vee: "\\vee",
  // Dots
  vdots: "\\vdots", ddots: "\\ddots",
  // Plus/minus
  "+-": "\\pm", "-+": "\\mp"
};

const LATEX_LITERAL_TO_HWP = {
  // Arrows
  to: "->", rightarrow: "->", leftarrow: "<-", leftrightarrow: "<->",
  Rightarrow: "=>", Leftarrow: "<=", Leftrightarrow: "Leftrightarrow",
  uparrow: "uparrow", downarrow: "downarrow",
  Uparrow: "Uparrow", Downarrow: "Downarrow",
  mapsto: "mapsto",
  // Comparisons
  infty: "inf", infinity: "inf",
  leq: "<=", le: "<=", geq: ">=", ge: ">=", neq: "<>", ne: "<>",
  "<=": "LEQ", ">=": "GEQ",
  // Set operators
  bigcup: "UNION", cup: "SMALLUNION", bigcap: "INTER", cap: "SMALLINTER",
  prod: "PROD", lim: "lim", bigg: "bigg",
  // Decorations
  overparen: "arch", underline: "under", overline: "bar",
  overrightarrow: "vec", overleftrightarrow: "dyad",
  widehat: "hat", widetilde: "tilde", check: "check",
  // Dots
  cdot: "cdot", cdots: "cdots", ldots: "...", dots: "...",
  vdots: "vdots", ddots: "ddots",
  // Plus/minus
  pm: "+-", mp: "-+",
  // Greek lowercase (complete)
  alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta",
  epsilon: "epsilon", zeta: "zeta", eta: "eta", theta: "theta",
  iota: "iota", kappa: "kappa", lambda: "lambda", mu: "mu",
  nu: "nu", xi: "xi", pi: "pi",
  rho: "rho", sigma: "sigma", tau: "tau", upsilon: "upsilon",
  phi: "phi", chi: "chi", psi: "psi", omega: "omega",
  // Greek variants
  varepsilon: "varepsilon", vartheta: "vartheta", varpi: "varpi",
  varrho: "varrho", varsigma: "varsigma", varphi: "varphi",
  // Greek uppercase
  Alpha: "ALPHA", Beta: "BETA", Gamma: "GAMMA", Delta: "DELTA",
  Epsilon: "EPSILON", Zeta: "ZETA", Eta: "ETA", Theta: "THETA",
  Iota: "IOTA", Kappa: "KAPPA", Lambda: "LAMBDA", Mu: "MU",
  Nu: "NU", Xi: "XI", Pi: "PI",
  Rho: "RHO", Sigma: "SIGMA", Tau: "TAU", Upsilon: "UPSILON",
  Phi: "PHI", Chi: "CHI", Psi: "PSI", Omega: "OMEGA",
  // Relations
  approx: "approx", sim: "sim", simeq: "simeq",
  equiv: "equiv", cong: "cong",
  prec: "prec", succ: "succ",
  "in": "in", notin: "notin", ni: "ni",
  subset: "subset", supset: "supset",
  subseteq: "subseteq", supseteq: "supseteq",
  parallel: "parallel", perp: "perp",
  mid: "mid", nmid: "nmid",
  ll: "ll", gg: "gg",
  propto: "propto",
  // Special symbols
  partial: "partial", nabla: "nabla",
  forall: "forall", exists: "exists",
  emptyset: "emptyset", varnothing: "varnothing",
  angle: "angle", triangle: "triangle",
  star: "star", circ: "circ", bullet: "bullet",
  oplus: "oplus", ominus: "ominus", otimes: "otimes", odot: "odot",
  dagger: "dagger", ddagger: "ddagger",
  aleph: "aleph",
  hbar: "hbar",
  ell: "ell",
  wp: "wp",
  Re: "Re", Im: "Im",
  prime: "prime",
  // Big operators
  coprod: "coprod",
  bigvee: "bigvee", bigwedge: "bigwedge",
  bigoplus: "bigoplus", bigotimes: "bigotimes",
  bigsqcup: "bigsqcup",
  // Delimiters
  langle: "langle", rangle: "rangle",
  lfloor: "lfloor", rfloor: "rfloor",
  lceil: "lceil", rceil: "rceil",
  // Logic
  land: "land", lor: "lor", lnot: "lnot",
  wedge: "wedge", vee: "vee"
};

const BINARY_OP_TO_LATEX = {
  times: "\\times",
  "#": "\\\\",
  "->": "\\to",
  "<-": "\\leftarrow",
  "<->": "\\leftrightarrow",
  "=>": "\\Rightarrow",
  "<=": "\\leq",
  ">=": "\\geq",
  "<>": "\\neq"
};

const RELATION_OPERATORS = new Set(["=", "<", ">", "<=", ">=", "<>", "->", "<-", "<->", "=>"]);

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
  tilde: "\\tilde"
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
  widetilde: "tilde"
};

const BASIC_FUNCTIONS = new Set([
  "sin","cos","coth","log","tan","cot","lg","sec","cosec",
  "max","min","csc","arcsin","arccos","arctan",
  "exp","Exp","det","gcd","cosh","tanh","mod","sinh",
  "if","for","and","hom","ker","deg","arg","dim","Pr","or",
  "inf","sup","ln","lim","liminf","limsup"
]);

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

function normalizeLatexOperator(value) {
  return LATEX_LITERAL_TO_HWP[value] || null;
}

function normalizeHwpOperator(value) {
  if (RELATION_OPERATORS.has(value)) return value;
  if (value === "LEQ") return "<=";
  if (value === "GEQ") return ">=";
  return HWP_LITERAL_TO_LATEX[value] ? (LATEX_LITERAL_TO_HWP[value] || value) : value;
}

function operatorToLatex(operator) {
  return BINARY_OP_TO_LATEX[operator] || operator;
}

function literalToLatex(value) {
  return HWP_LITERAL_TO_LATEX[value] || value;
}

function literalToHwp(value) {
  return LATEX_LITERAL_TO_HWP[value] || value;
}

function isFunctionLikeValue(value) {
  return BASIC_FUNCTIONS.has(value) || ["LIM", "lim", "Lim", "PROD", "prod"].includes(value);
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
  return `\\${name}`;
}

function flattenImplicitFactors(node) {
  if (node && node.type === "BinaryOp" && node.operator === "") {
    return [...flattenImplicitFactors(node.left), ...flattenImplicitFactors(node.right)];
  }
  return [node];
}

function implicitJoinSeparator(previousNode, currentNode, target) {
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
  if (!previousFunctionName) return "";
  if (currentNode && currentNode.type === "Bracket") return "";
  if (target === "latex") return " ";
  return HWP_TIGHT_FUNCTIONS.has(previousFunctionName) ? "" : " ";
}

function formatImplicitSequence(node, renderFactor, target) {
  const factors = flattenImplicitFactors(node);
  let rendered = "";
  for (let i = 0; i < factors.length; i++) {
    if (i > 0) rendered += implicitJoinSeparator(factors[i - 1], factors[i], target);
    rendered += renderFactor(factors[i]);
  }
  return rendered;
}

function wrapStyledChildForHwp(node) {
  if (!node) return "";
  const rendered = toHwpEqn(node);
  if (["Literal", "FunctionName", "Text", "Bracket", "Styled", "Subscript", "Superscript"].includes(node.type)) return rendered;
  return `{${rendered}}`;
}

function formatStyledForHwp(style, childNode) {
  const child = wrapStyledChildForHwp(childNode);
  return child.startsWith("{") ? `${style}${child}` : `${style} ${child}`;
}

function makeNameNode(value) {
  return { type: BASIC_FUNCTIONS.has(value) ? "FunctionName" : "Literal", value };
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
