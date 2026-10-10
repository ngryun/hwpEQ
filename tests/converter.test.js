const { test } = require("node:test");
const assert = require("node:assert/strict");
const { convertHwpToLatex, convertLatexToHwp } = require("./load-converter");

const HWP_TO_LATEX = [
  // Core syntax
  ["x^2 + y^2", "x^{2} + y^{2}"],
  ["y^2 over z", "\\frac{y^{2}}{z}"],
  ["a over b over c", "\\frac{\\frac{a}{b}}{c}"],
  ["a sinx", "a \\sin x"],
  ["sin^2 x", "\\sin^{2} x"],
  ["sintheta", "\\sin \\theta"],
  ["log_2 8", "\\log_{2} 8"],
  ["int_1^2 {x^3}", "\\int_{1}^{2} x^{3}"],
  ["sqrt {a + b}", "\\sqrt{a + b}"],
  ["root 3 of x", "\\sqrt[3]{x}"],
  ["sum_1^n {k^2}", "\\sum_{1}^{n} k^{2}"],
  ["lim_{x->0} f(x)", "\\lim_{x \\to 0} f(x)"],
  ["x LEQ y", "x \\leq y"],
  ["x GEQ y", "x \\geq y"],
  ["x<=y", "x \\leq y"],
  ["x times y", "x \\times y"],
  ["n choose k", "\\binom{n}{k}"],
  ["binom n k", "\\binom{n}{k}"],
  ["not =", "\\not="],
  ["x # y", "x \\\\ y"],
  ["\"text\" x", "\\text{text}x"],
  ["alpha beta", "\\alpha\\beta"],
  ["e^{i pi} + 1 = 0", "e^{i\\pi} + 1 = 0"],
  // Decorations and styles
  ["bar x", "\\bar{x}"],
  ["dyad AB", "\\overleftrightarrow{AB}"],
  ["arch AB", "\\overparen{AB}"],
  ["rm abc", "\\mathrm{abc}"],
  ["rmbold v", "\\mathbf{v}"],
  // Brackets and environments
  ["LEFT ( x over 2 RIGHT )", "\\left( \\frac{x}{2} \\right)"],
  ["LEFT | x RIGHT |", "\\left| x \\right|"],
  ["cases{x & x>0 # -x & x<0}", "\\begin{cases} x & x > 0 \\\\ -x & x < 0 \\end{cases}"],
  ["pmatrix{1 & 2 # 3 & 4}", "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}"],
  ["bmatrix{lcol{a # c} rcol{b # d}}", "\\left[ \\begin{array}{lr} a & b \\\\ c & d \\end{array} \\right]"],
  ["dmatrix{a&b#c&d}", "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}"],
  ["eqalign{a&=b#c&=d}", "\\begin{aligned} a & =b \\\\ c & =d \\end{aligned}"],
  ["pile{a#b}", "\\begin{array}{c} a \\\\ b \\end{array}"],
];

// Inputs that used to be silently truncated or mangled.
const HWP_TO_LATEX_FIXES = [
  // Commas, spaces and primes must not end the expression
  ["f(x,y)", "f(x,y)"],
  ["f(x, y) = x + y", "f(x,y) = x + y"],
  ["x_1 , x_2 , cdots , x_n", "x_{1},x_{2},\\cdots,x_{n}"],
  ["x ~ = ~ 1", "x~ = ~1"],
  ["a ` b", "a\\,b"],
  ["f'(x) = 2x", "f'(x) = 2x"],
  ["n! + 1", "n! + 1"],
  // Compound operators
  ["x != 0", "x \\neq 0"],
  ["a +- b", "a \\pm b"],
  ["a -+ b", "a \\mp b"],
  ["+- 1", "\\pm 1"],
  ["-b +- sqrt{b^2 - 4ac}", "-b \\pm \\sqrt{b^{2} - 4ac}"],
  // LEFT/RIGHT always paired, "." as invisible delimiter
  ["LEFT { x RIGHT .", "\\left\\{ x \\right."],
  ["LEFT . x RIGHT |", "\\left. x \\right|"],
  ["LEFT ( x", "\\left( x \\right."],
  ["LEFT [ 0, 1 RIGHT )", "\\left[ 0,1 \\right)"],
  // Half-open intervals and unmatched closers keep the rest of the input
  ["[0, 1)", "[0,1)"],
  ["(0, 1]", "(0,1]"],
  ["a ) b", "a)b"],
  // Command names must not merge with the following letter
  ["pi r^2", "\\pi r^{2}"],
  ["x in A", "x\\in A"],
  ["partial f", "\\partial f"],
  ["A SMALLINTER B", "A\\cap B"],
  ["a cdot b", "a\\cdot b"],
  ["not A", "\\not A"],
  ["x not in A", "x\\not\\in A"],
];

const LATEX_TO_HWP = [
  ["x^{2} + y^{2}", "x^{2} + y^{2}"],
  ["\\frac{y^2}{z}", "{y^{2}} over {z}"],
  ["a \\sin x", "a sinx"],
  ["\\sin^2 x + \\cos^2 x = 1", "sin^{2}x + cos^{2}x = 1"],
  ["\\lim_{x \\to 0} \\frac{\\sin x}{x}", "lim_{x -> 0} {sinx} over {x}"],
  ["\\int_{1}^{2} {x^3}", "int_{1}^{2} x^{3}"],
  ["\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}", "int_{-inf}^{inf} e^{-x^{2}}dx = sqrt{pi}"],
  ["\\sqrt{a + b}", "sqrt{a + b}"],
  ["\\sqrt[3]{x}", "root {3} of {x}"],
  ["\\sum_{1}^{n} {k^2}", "sum_{1}^{n} k^{2}"],
  ["a \\le b", "a LEQ b"],
  ["x \\geq 0", "x GEQ 0"],
  ["a \\neq b", "a <> b"],
  ["\\binom{n}{k}", "n choose k"],
  ["1+2+\\cdots+n", "1 + 2 + cdots + n"],
  ["f(x) = x^2", "f(x) = x^{2}"],
  ["\\max(a,b)", "max(a , b)"],
  ["\\operatorname{sgn} x", "sgn x"],
  ["\\text{if } x > 0", "\"if \"x > 0"],
  ["\\mathbf{v}", "rmbold v"],
  ["\\overline{AB}", "bar{AB}"],
  ["\\vec{v}", "vec{v}"],
  ["a \\overset{x}{=} b", "a BUILDREL = {x} b"],
  ["a \\overset{x}{\\underset{y}{=}} b", "a REL = {x} {y} b"],
  ["\\left\\{ x \\right\\}", "LEFT { x RIGHT }"],
  ["\\left( \\frac{1}{2} \\right)^2", "LEFT ( {1} over {2} RIGHT )^{2}"],
  ["\\begin{cases} x=1 \\\\ y=2 \\end{cases}", "cases{x = 1 # y = 2}"],
  ["\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}", "pmatrix{1 & 2 # 3 & 4}"],
  ["\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", "dmatrix{a & b # c & d}"],
  ["\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}", "eqalign{a & = b # c & = d}"],
  ["\\left[\\begin{array}{lr} a & b \\\\ c & d \\end{array}\\right]", "bmatrix{lcol{a # c} rcol{b # d}}"],
];

const LATEX_TO_HWP_FIXES = [
  // Command names must not merge with neighbouring letters
  ["\\pi r^2", "pi r^{2}"],
  ["x \\in A", "x in A"],
  ["A \\cap B", "A SMALLINTER B"],
  ["\\partial f", "partial f"],
  ["e^{i\\pi}+1=0", "e^{i pi} + 1 = 0"],
  ["\\int_0^1 x dx", "int_{0}^{1} x dx"],
  ["\\frac{\\partial^2 u}{\\partial x^2}", "{partial^{2}u} over {partial x^{2}}"],
  // Half-open intervals
  ["[0,1)", "[0 , 1)"],
  ["(0,1]", "(0 , 1]"],
  // \left/\right always paired, "." as invisible delimiter
  ["\\left\\{ x \\right.", "LEFT { x RIGHT ."],
  ["\\left. \\frac{df}{dx} \\right|_{x=0}", "LEFT . {df} over {dx} RIGHT |_{x = 0}"],
  // \underset without \overset used to crash
  ["a \\underset{x}{=} b", "a REL = {} {x} b"],
  ["\\pm 1", "+- 1"],
];

// LaTeX -> HWP -> LaTeX must come back to an equivalent expression.
const LATEX_ROUND_TRIPS = [
  ["\\pm 1", "\\pm 1"],
  ["x \\in A", "x\\in A"],
  ["\\pi r^2", "\\pi r^{2}"],
  ["[0,1)", "[0,1)"],
  ["\\left\\{ x \\right.", "\\left\\{ x \\right."],
  ["f(x,y) = x", "f(x,y) = x"],
];

for (const [input, expected] of [...HWP_TO_LATEX, ...HWP_TO_LATEX_FIXES]) {
  test(`HWP→LaTeX: ${input}`, () => assert.equal(convertHwpToLatex(input), expected));
}

for (const [input, expected] of [...LATEX_TO_HWP, ...LATEX_TO_HWP_FIXES]) {
  test(`LaTeX→HWP: ${input}`, () => assert.equal(convertLatexToHwp(input), expected));
}

for (const [input, expected] of LATEX_ROUND_TRIPS) {
  test(`LaTeX→HWP→LaTeX: ${input}`, () => assert.equal(convertHwpToLatex(convertLatexToHwp(input)), expected));
}

// Deterministic PRNG so fuzz failures are reproducible.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fuzz(convert, alphabet, seed) {
  const random = mulberry32(seed);
  for (let i = 0; i < 3000; i++) {
    let input = "";
    const length = 1 + Math.floor(random() * 25);
    for (let j = 0; j < length; j++) input += alphabet[Math.floor(random() * alphabet.length)];
    assert.doesNotThrow(() => convert(input), `input: ${JSON.stringify(input)}`);
  }
}

test("HWP→LaTeX never throws on random input", () => {
  fuzz(convertHwpToLatex, [
    "x", "1", "{", "}", "(", ")", "[", "]", "|", "^", "_", "#", "&", "over", "sqrt", "LEFT", "RIGHT", ".",
    "matrix", "lcol", "cases", "\"", "\\\\", "sum", "int", "REL", "BUILDREL", "root", "of", "rm", "not",
    " ", "-", "+", ">", "<", "=", "!", ",", "~", "`", "'"
  ], 1);
});

test("LaTeX→HWP never throws on random input", () => {
  fuzz(convertLatexToHwp, [
    "x", "1", "{", "}", "\\{", "\\}", "(", ")", "[", "]", "|", "^", "_", "&", "\\\\", ".", "\\frac", "\\sqrt",
    "\\left", "\\right", "\\begin{pmatrix}", "\\end{pmatrix}", "\\begin{array}{lc}", "\\end{array}", "\\text{",
    "\\overset", "\\underset", "\\operatorname", "\\mathrm", " ", "-", ">", "<", "=", "\"", "\\"
  ], 2);
});
