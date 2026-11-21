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

// Commands from Hancom's equation spec (한글 문서 파일 형식 - 수식, revision 1.3) that used to pass through as plain letters.
const HWP_TO_LATEX_SPEC_COMMANDS = [
  // Scripts: SUP/SUB words, left scripts, from/to limits
  ["x sup 2", "x^{2}"],
  ["a SUB i SUP 2", "a_{i}^{2}"],
  ["x LSUB y", "{}_{y}x"],
  ["x LSUP y", "{}^{y}x"],
  ["int from 0 to 3 x dx", "\\int_{0}^{3} xdx"],
  ["sum from {k=1} to n k", "\\sum_{k = 1}^{n} k"],
  ["prod from {k=1} to n a_k", "\\prod_{k = 1}^{n} a_{k}"],
  // Integrals
  ["dint_D f", "\\iint_{D} f"],
  ["tint f", "\\iiint f"],
  ["ODINT f", "\\oiint f"],
  ["otint f", "\\oiiint f"],
  // inf is the infinity sign, not the infimum
  ["lim_{n->inf} a_n", "\\lim_{n \\to \\infty} a_{n}"],
  ["x -> INF", "x \\to \\infty"],
  // Functions and reserved upright words
  ["lcm(a,b)", "\\operatorname{lcm}(a,b)"],
  ["asin x", "\\operatorname{asin} x"],
  ["a mod b", "a \\bmod b"],
  ["a and b", "a \\operatorname{and} b"],
  ["deg f", "\\deg f"],
  ["90 DEG", "90^{\\circ}"],
  // Greek: capitalised and all-uppercase names are both capitals
  ["Gamma", "\\Gamma"],
  ["GAMMA + gamma", "\\Gamma + \\gamma"],
  ["Omicron", "O"],
  ["varupsilon", "\\Upsilon"],
  // Commands work in all-uppercase or all-lowercase; mixed case is plain text
  ["A SUBSET B", "A\\subset B"],
  ["x IN A", "x\\in A"],
  ["Subset", "Subset"],
  // Arrows: lowercase single, uppercase double
  ["x rarrow 0", "x \\to 0"],
  ["a larrow b", "a \\leftarrow b"],
  ["a lrarrow b", "a \\leftrightarrow b"],
  ["p RARROW q", "p \\Rightarrow q"],
  ["p LARROW q", "p \\Leftarrow q"],
  ["p LRARROW q", "p \\Leftrightarrow q"],
  ["a udarrow b", "a\\updownarrow b"],
  ["a UPARROW b", "a\\Uparrow b"],
  ["nearrow", "\\nearrow"],
  ["hookright", "\\hookrightarrow"],
  ["a vert b", "a\\vert b"],
  ["a VERT b", "a\\Vert b"],
  ["A REL rarrow {f} {g} B", "A \\overset{f}{\\underset{g}{\\to}} B"],
  // Sets
  ["A UNION B", "A\\cup B"],
  ["UNION_{i=1}^n A_i", "\\bigcup_{i = 1}^{n}A_{i}"],
  ["(A UNION B)^C` =` A^C INTER B^C", "(A\\cup B)^{C}\\, = \\,A^{C}\\cap B^{C}"],
  ["A CUP B", "A\\cup B"],
  ["A SQCAP B", "A\\sqcap B"],
  ["A OSLASH B", "A\\oslash B"],
  ["A OWNS x", "A\\ni x"],
  ["A SQSUBSETEQ B", "A\\sqsubseteq B"],
  ["A UPLUS B", "A\\uplus B"],
  ["COPROD", "\\coprod"],
  ["smallsum_{k=1}^n k", "\\sum_{k = 1}^{n} k"],
  // Multi-character relations
  ["a == b", "a \\equiv b"],
  ["a << b", "a \\ll b"],
  ["a >> b", "a \\gg b"],
  ["a <<< b", "a \\lll b"],
  ["a >>> b", "a \\ggg b"],
  ["a LLL b", "a \\lll b"],
  ["a neq b", "a \\neq b"],
  // Operators and logic
  ["a PLUSMINUS b", "a\\pm b"],
  ["a MINUSPLUS b", "a\\mp b"],
  ["a DIVIDE b", "a\\div b"],
  ["THEREFORE x = 1", "\\therefore x = 1"],
  ["BECAUSE x", "\\because x"],
  ["EXIST x", "\\exists x"],
  ["a DOTEQ b", "a\\doteq b"],
  ["a image b", "a\\fallingdotseq b"],
  ["a REIMAGE b", "a\\risingdotseq b"],
  ["a ASYMP b", "a\\asymp b"],
  ["a XOR b", "a\\veebar b"],
  ["TRIANGLED f", "\\nabla f"],
  ["STAR", "\\bigstar"],
  ["BIGCIRC", "\\bigcirc"],
  // Letter-like and miscellaneous symbols
  ["IMATH", "\\imath"],
  ["OHM", "\\Omega"],
  ["LITER", "\\ell"],
  ["IMAG", "\\Im"],
  ["ANGSTROM", "\\mathring{\\mathrm{A}}"],
  ["LAPLACE", "\\mathcal{L}"],
  ["LDOTS", "\\ldots"],
  ["MSANGLE A", "\\measuredangle A"],
  ["VDASH", "\\vdash"],
  ["HLEFT", "\\dashv"],
  ["BOT", "\\bot"],
  ["MODELS", "\\models"],
  ["25 CENTIGRADE", "25^{\\circ}\\mathrm{C}"],
  ["hund", "\\text{‰}"],
  // Decorations stretch over everything beneath them
  ["bar AB", "\\overline{AB}"],
  ["vec AB", "\\overrightarrow{AB}"],
  ["hat ABC", "\\widehat{ABC}"],
  ["hat alpha", "\\hat{\\alpha}"],
  ["overline AB", "\\overline{AB}"],
  ["UNDERLINE {AB}", "\\underline{AB}"],
  ["BOX {x}", "\\boxed{x}"],
  ["OVERBRACE {a+b} {n}", "\\overbrace{a + b}^{n}"],
  ["UNDERBRACE {a+b} {n}", "\\underbrace{a + b}_{n}"],
  // Named delimiters after LEFT/RIGHT
  ["LEFT < x RIGHT >", "\\left\\langle x \\right\\rangle"],
  ["LEFT lceil x RIGHT rceil", "\\left\\lceil x \\right\\rceil"],
  ["LEFT ⌊ x RIGHT ⌋", "\\left\\lfloor x \\right\\rfloor"],
  ["LEFT VERT x RIGHT VERT", "\\left\\| x \\right\\|"],
  ["LEFT lbrace x RIGHT rbrace", "\\left\\{ x \\right\\}"],
  // Size, colour, division layouts
  ["scale 70 x", "{\\scriptsize x}"],
  ["COLOR {255,0,255} {3}", "\\textcolor{#FF00FF}{3}"],
  ["LADDER {2&12&28#2&6&14#3&7&}", "\\begin{array}{r|rr} 2 & 12 & 28 \\\\ \\hline 2 & 6 & 14 \\\\ \\hline  & 3 & 7 \\end{array}"],
  ["SLADDER {2&12&#2&6&0#1&1&}", "\\begin{array}{r|rr} 2 & 12 &  \\\\ \\hline 2 & 6 & 0 \\\\ \\hline  & 1 & 1 \\end{array}"],
  ["LONGDIV {6}{42}{252#24#12#12#0}", "\\begin{array}{r} 42 \\\\ 6 \\overline{\\smash{)}\\,252} \\\\ 24 \\\\ \\hline 12 \\\\ 12 \\\\ \\hline 0 \\end{array}"],
  // Empty groups
  ["a REL = {} {x} b", "a \\underset{x}{=} b"],
  ["x^{}", "x^{}"],
  // Names that are also Object.prototype members stay plain text
  ["constructor", "constructor"],
];

// HWP splits an equation into terms at whitespace; OVER, scripts and font switches follow those terms.
const HWP_TO_LATEX_TERM_RULES = [
  // OVER, ATOP and CHOOSE take the whole term on either side, and nothing more
  ["2 a over b", "2\\frac{a}{b}"],
  ["2a over b", "\\frac{2a}{b}"],
  ["a b over c d", "a\\frac{b}{c}d"],
  ["a+b over c", "\\frac{a + b}{c}"],
  ["a + b over c", "a + \\frac{b}{c}"],
  ["1 over 2x", "\\frac{1}{2x}"],
  ["1 over 2 x", "\\frac{1}{2}x"],
  ["{a+b} over {a-b}", "\\frac{a + b}{a - b}"],
  ["x = {-b +- sqrt{b^2 - 4ac}} over {2a}", "x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}"],
  ["lim_{x -> 0} {sin x} over x = 1", "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1"],
  ["sqrt 3 over 2", "\\frac{\\sqrt{3}}{2}"],
  ["f(x, y) over 2", "\\frac{f(x,y)}{2}"],
  ["LEFT ( a RIGHT ) over 2", "\\frac{\\left( a \\right)}{2}"],
  ["sum_{k=1}^n k over 2", "\\sum_{k = 1}^{n} \\frac{k}{2}"],
  ["1 over {1 + 1 over x}", "\\frac{1}{1 + \\frac{1}{x}}"],
  ["bigg / {x+y} over {x-y}", "\\bigg/\\frac{x + y}{x - y}"],
  ["n+1 choose k", "\\binom{n + 1}{k}"],
  ["10a^3 over b^2 times ~□ ~÷ b^3 over 2a =( 2a^2 over b )^3", "\\frac{10a^{3}}{b^{2}} \\times ~□~÷\\frac{b^{3}}{2a} = (\\frac{2a^{2}}{b})^{3}"],
  ["over b", "\\frac{}{b}"],
  ["a over {}", "\\frac{a}{}"],
  // An unbraced script runs to the next space
  ["x^2n", "x^{2n}"],
  ["x^2 n", "x^{2}n"],
  ["a^2+b^2", "a^{2 + b^{2}}"],
  ["a^2 +b^2", "a^{2} + b^{2}"],
  ["e^-x", "e^{-x}"],
  ["a_n+1", "a_{n + 1}"],
  ["f(x^2+1)", "f(x^{2 + 1})"],
  ["x_1y_2", "x_{1y_{2}}"],
  ["x_1 y_2", "x_{1}y_{2}"],
  // ... but stops at the other script mark, which goes on the same base
  ["sum_n=1^N", "\\sum_{n = 1}^{N}"],
  ["x^2_1", "x^{2}_{1}"],
  ["lim_N->inf 1 over N sum_n=1^N LEFT(SUM_k=1^n 1 over 2^k right)", "\\lim_{N \\to \\infty} \\frac{1}{N}\\sum_{n = 1}^{N} \\left( \\sum_{k = 1}^{n} \\frac{1}{2^{k}} \\right)"],
  // ... and leaves closing punctuation and a following root outside
  ["(x_1, x_2)", "(x_{1},x_{2})"],
  ["a_1,2", "a_{1,2}"],
  ["int from 0 to 3 `^3sqrt{x^2 +1}dx", "\\int_{0}^{3} \\,^3\\sqrt{x^{2} + 1}dx"],
  ["2^sqrt2", "2^{\\sqrt{2}}"],
  // Arrows are written without a space inside
  ["x < -1", "x < -1"],
  ["x<-1", "x \\leftarrow 1"],
  ["-1 < x < -1 over 2", "-1 < x < \\frac{-1}{2}"],
  // rm and it switch the font to the end of the group; bold styles one item
  ["rm 2H_2 O = 2H_2 + O_2", "\\mathrm{2H_{2}O = 2H_{2} + O_{2}}"],
  ["{rm A} + B", "\\mathrm{A} + B"],
  ["rm A it B", "\\mathrm{A\\mathit{B}}"],
  ["a + rm b", "a + \\mathrm{b}"],
  ["{rm kg} over {rm m^3}", "\\frac{\\mathrm{kg}}{\\mathrm{m^{3}}}"],
  ["Equation rm font it test", "Equation\\mathrm{font\\mathit{test}}"],
  ["bold v + w", "\\boldsymbol{v} + w"],
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
  ["a \\neq b", "a != b"],
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

// LaTeX commands whose HWP counterpart has a different name or shape.
const LATEX_TO_HWP_SPEC_COMMANDS = [
  // Arrows and relations
  ["p \\Rightarrow q", "p RARROW q"],
  ["p \\Leftarrow q", "p LARROW q"],
  ["p \\Leftrightarrow q", "p LRARROW q"],
  ["p \\iff q", "p LRARROW q"],
  ["\\updownarrow", "udarrow"],
  ["\\Uparrow", "UPARROW"],
  ["\\hookrightarrow", "hookright"],
  ["a \\ll b", "a << b"],
  ["a \\ggg b", "a >>> b"],
  ["A \\xrightarrow{f} B", "A BUILDREL -> {f} B"],
  ["A \\xrightarrow[g]{f} B", "A REL -> {f} {g} B"],
  ["a \\stackrel{x}{=} b", "a BUILDREL = {x} b"],
  // Symbols
  ["\\exists x", "exist x"],
  ["A \\ni x", "A owns x"],
  ["a \\perp b", "a bot b"],
  ["\\neg p", "lnot p"],
  ["\\varnothing", "emptyset"],
  ["a \\veebar b", "a xor b"],
  ["\\measuredangle A", "msangle A"],
  ["\\Gamma", "GAMMA"],
  ["1, 2, \\ldots, n", "1 , 2 , ldots , n"],
  // Integrals and functions
  ["\\iint_D f", "dint_{D} f"],
  ["\\oiint_S F", "odint_{S} F"],
  ["\\sup_{x} f", "\"sup\"_{x} f"],
  ["\\inf_{x} f", "\"inf\"_{x} f"],
  ["a \\bmod b", "a mod b"],
  ["a \\equiv b \\pmod{n}", "a equiv b(mod n)"],
  // Size variants and layout hints
  ["\\dfrac{a}{b}", "{a} over {b}"],
  ["\\tfrac{a}{b}", "{a} over {b}"],
  ["\\displaystyle\\sum_{k=1}^n k", "sum_{k = 1}^{n} k"],
  ["\\lim\\limits_{x\\to 0} f", "lim_{x -> 0} f"],
  // Spacing
  ["a\\,b", "a ` b"],
  ["a\\;b", "a ~ b"],
  ["a \\quad b", "a ~~ b"],
  ["a\\!b", "a b"],
  // Delimiters
  ["\\left\\langle x \\right\\rangle", "LEFT < x RIGHT >"],
  ["\\left\\lceil x \\right\\rceil", "LEFT lceil x RIGHT rceil"],
  ["\\left\\| x \\right\\|", "LEFT VERT x RIGHT VERT"],
  ["\\left\\lvert x \\right\\rvert", "LEFT | x RIGHT |"],
  ["\\|x\\|", "VERT x VERT"],
  // Decorations, braces, colour
  ["\\boxed{x}", "box{x}"],
  ["\\overbrace{a+b}^{n}", "overbrace{a + b}{n}"],
  ["\\underbrace{a+b}_{n}", "underbrace{a + b}{n}"],
  ["\\textcolor{red}{x}", "color{255,0,0}{x}"],
  ["\\textcolor{#0f0}{x}", "color{0,255,0}{x}"],
  ["\\textcolor[RGB]{1,2,3}{x}", "color{1,2,3}{x}"],
  ["{\\color{blue} x} + y", "{color{0,0,255}{x}} + y"],
  ["\\textcolor{nosuchcolor}{x}", "x"],
  // Output that HWP would otherwise read differently
  ["x<-1", "x < -1"],
  ["x < -1", "x < -1"],
  ["\\mathrm{A} + B", "{rm A} + B"],
  ["\\mathrm{d}x", "{rm d}x"],
  ["\\binom{n+1}{k}", "{n + 1} choose k"],
];

// LaTeX -> HWP -> LaTeX must come back to an equivalent expression.
const LATEX_ROUND_TRIPS = [
  ["\\pm 1", "\\pm 1"],
  ["x \\in A", "x\\in A"],
  ["\\pi r^2", "\\pi r^{2}"],
  ["[0,1)", "[0,1)"],
  ["\\left\\{ x \\right.", "\\left\\{ x \\right."],
  ["f(x,y) = x", "f(x,y) = x"],
  ["a \\neq b", "a \\neq b"],
  ["p \\Leftrightarrow q", "p \\Leftrightarrow q"],
  ["p \\Leftarrow q", "p \\Leftarrow q"],
  ["a \\ll b", "a \\ll b"],
  ["x \\to \\infty", "x \\to \\infty"],
  ["\\iint_D f", "\\iint_{D} f"],
  ["\\overline{AB}", "\\overline{AB}"],
  ["\\bar{x}", "\\bar{x}"],
  ["\\overrightarrow{AB}", "\\overrightarrow{AB}"],
  ["\\left\\langle x \\right\\rangle", "\\left\\langle x \\right\\rangle"],
  ["\\left\\| x \\right\\|", "\\left\\| x \\right\\|"],
  ["a \\underset{x}{=} b", "a \\underset{x}{=} b"],
  ["\\textcolor{#FF0000}{x}", "\\textcolor{#FF0000}{x}"],
  ["\\overbrace{a+b}^{n}", "\\overbrace{a + b}^{n}"],
  ["\\boxed{x}", "\\boxed{x}"],
  ["\\operatorname{lcm}(a,b)", "\\operatorname{lcm}(a,b)"],
  ["a \\bmod b", "a \\bmod b"],
  ["\\bigcup_{i=1}^{n} A_i", "\\bigcup_{i = 1}^{n}A_{i}"],
  ["A \\cup B", "A\\cup B"],
  ["\\frac{1}{2}x", "\\frac{1}{2}x"],
  ["2\\frac{a}{b}", "2\\frac{a}{b}"],
  ["\\frac{a+b}{c}d", "\\frac{a + b}{c}d"],
  ["\\frac{\\mathrm{d}y}{\\mathrm{d}x}", "\\frac{\\mathrm{d}y}{\\mathrm{d}x}"],
  ["\\lim_{N\\to\\infty}\\frac{1}{N}", "\\lim_{N \\to \\infty} \\frac{1}{N}"],
  ["x^{2}n", "x^{2}n"],
  ["a^2+b^2", "a^{2} + b^{2}"],
  ["x_1y_2", "x_{1}y_{2}"],
  ["x < -1", "x < -1"],
  ["\\mathrm{A} + B", "\\mathrm{A} + B"],
  ["\\binom{n+1}{k}", "\\binom{n + 1}{k}"],
  ["\\sqrt{2}x", "\\sqrt{2}x"],
];

for (const [input, expected] of [...HWP_TO_LATEX, ...HWP_TO_LATEX_FIXES, ...HWP_TO_LATEX_SPEC_COMMANDS, ...HWP_TO_LATEX_TERM_RULES]) {
  test(`HWP→LaTeX: ${input}`, () => assert.equal(convertHwpToLatex(input), expected));
}

for (const [input, expected] of [...LATEX_TO_HWP, ...LATEX_TO_HWP_FIXES, ...LATEX_TO_HWP_SPEC_COMMANDS]) {
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
    " ", "-", "+", ">", "<", "=", "!", ",", "~", "`", "'",
    "sup", "sub", "LSUB", "LSUP", "from", "to", "dint", "scale", "70", "COLOR", "LADDER", "LONGDIV",
    "OVERBRACE", "BOX", "rarrow", "UNION", "inf", "⌈", "VERT", "prod",
    "atop", "choose", "it", "bold", "a", "2"
  ], 1);
});

test("LaTeX→HWP never throws on random input", () => {
  fuzz(convertLatexToHwp, [
    "x", "1", "{", "}", "\\{", "\\}", "(", ")", "[", "]", "|", "^", "_", "&", "\\\\", ".", "\\frac", "\\sqrt",
    "\\left", "\\right", "\\begin{pmatrix}", "\\end{pmatrix}", "\\begin{array}{lc}", "\\end{array}", "\\text{",
    "\\overset", "\\underset", "\\operatorname", "\\mathrm", " ", "-", ">", "<", "=", "\"", "\\",
    "\\xrightarrow", "\\stackrel", "\\color", "\\textcolor", "red", "#", "\\overbrace", "\\underbrace",
    "\\boxed", "\\pmod", "\\iint", "\\langle", "\\|", "\\,", "\\dfrac", "\\sup", "\\Rightarrow"
  ], 2);
});
