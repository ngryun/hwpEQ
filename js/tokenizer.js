// ═══════════════════════════════════════════════════════════
// Tokenizer & Token Types
// ═══════════════════════════════════════════════════════════
const TokenType = { KEYWORD: 0, IDENT: 1, NUMBER: 2, SYMBOL: 3, SPACE: 4, EOF: 5, UNKNOWN: 6, TEXT: 7 };

function isAlpha(ch) { return /^[A-Za-z]$/.test(ch); }
function isUnicodeLetter(ch) { return /^\p{L}$/u.test(ch); }
function isIdentifierChar(ch) { return isAlpha(ch) || isUnicodeLetter(ch); }
function isDigit(ch) { return /^[0-9]$/.test(ch); }
function isOpenDelimiter(ch) { return "([{|".includes(ch); }
function isCloseDelimiter(ch) { return ")]}|".includes(ch); }
function matchingDelimiter(ch) {
  return { "(": ")", "[": "]", "{": "}", "|": "|" }[ch] || "";
}
// Parentheses and square brackets may close each other so half-open intervals like [0, 1) parse.
function closesBracket(open, close) {
  if (open === "(" || open === "[") return close === ")" || close === "]";
  return matchingDelimiter(open) === close;
}

function readLiteralRun(input, start, stopChars) {
  let i = start;
  let value = "";

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch) || stopChars.includes(ch)) break;
    value += ch;
    i++;
  }

  return { value, end: i };
}

function readQuotedTextContent(input, start) {
  let i = start;
  let value = "";

  while (i < input.length) {
    const ch = input[i];
    if (ch === "\"") return { value, end: i };
    if (ch === "\\" && i + 1 < input.length && input[i + 1] === "\"") {
      value += "\"";
      i += 2;
      continue;
    }
    value += ch;
    i++;
  }

  return { value, end: i };
}

function readLatexTextContent(input, start) {
  let i = start;
  let depth = 1;
  let value = "";

  while (i < input.length) {
    const ch = input[i];

    if (ch === "\\") {
      if (i + 1 >= input.length) {
        value += "\\";
        i++;
        continue;
      }

      const next = input[i + 1];
      if (/[A-Za-z]/.test(next)) {
        let command = "";
        i++;
        while (i < input.length && /[A-Za-z]/.test(input[i])) {
          command += input[i];
          i++;
        }
        value += "\\" + command;
        continue;
      }

      value += next;
      i += 2;
      continue;
    }

    if (ch === "{") {
      depth++;
      value += ch;
      i++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) return { value, end: i };
      value += ch;
      i++;
      continue;
    }

    value += ch;
    i++;
  }

  return { value, end: i };
}

const HWP_KEYWORDS = new Set([
  "TIMES","OVER","ATOP","SQRT","INT","OINT","SUM","PROD","LIM",
  "UNION","INTER","SMALLUNION","SMALLINTER",
  "ACUTE","GRAVE","DOT","DDOT","BAR","VEC","DYAD","UNDER",
  "HAT","ARCH","CHECK","TILDE","LEFT","RIGHT",
  "MATRIX","PMATRIX","BMATRIX","DMATRIX","CASES",
  "PILE","LPILE","RPILE","EQALIGN",
  "CHOOSE","BINOM","NOT","REL","BUILDREL","BIGG","COL","LCOL","RCOL",
  "GEQ","LEQ",
  "RM","IT","BOLD","RMBOLD",
  "ROOT","OF",
  "DINT","TINT","ODINT","OTINT","SMALLINT","SMALLOINT","SMALLSUM",
  "LSUB","LSUP","SCALE","COLOR",
  "LADDER","SLADDER","LONGDIV",
  "OVERLINE","UNDERLINE","BOX","OVERBRACE","UNDERBRACE"
]);

// SUP and SUB are the word forms of ^ and _.
const HWP_SCRIPT_WORDS = { SUP: "^", SUB: "_" };

const LATEX_KEYWORDS = new Set([
  "int","oint","iint","iiint","oiint","oiiint",
  "sum","prod","sqrt","frac","over","atop","choose","binom","lim",
  "acute","grave","dot","ddot","bar","vec","hat","tilde","check",
  "widehat","widetilde","overparen","underline","overline","overrightarrow","overleftrightarrow",
  "times","left","right","begin","end","not","bigg","biggl","biggr","biggm",
  "overset","underset","stackrel","text","mathrm","mathit","mathbf","boldsymbol","operatorname",
  "boxed","overbrace","underbrace","textcolor","color","pmod"
]);

// Commands that only pick a size variant of another command.
const LATEX_KEYWORD_ALIASES = { dfrac: "frac", tfrac: "frac", cfrac: "frac", dbinom: "binom", tbinom: "binom" };

// Layout hints with no HWP counterpart.
const LATEX_IGNORED_COMMANDS = new Set([
  "displaystyle","textstyle","scriptstyle","scriptscriptstyle","limits","nolimits"
]);

// Arrows that carry text above/below, as the relation they draw. Case matters (\xRightarrow).
const LATEX_EXTENSIBLE_ARROWS = {
  xrightarrow: "->", xleftarrow: "<-", xleftrightarrow: "<->",
  xRightarrow: "=>", xLeftarrow: "<==", xLeftrightarrow: "<=>"
};

// Backslash followed by punctuation, as the command name it abbreviates ("\!" is dropped).
const LATEX_CONTROL_SYMBOLS = {
  ",": "thinspace", ":": "medspace", ";": "thickspace", " ": "space", "|": "Vert", "!": null
};

const HWP_TIGHT_FUNCTION_PREFIXES_IN_TOKENIZER = [
  "arcsin","arccos","arctan",
  "cosec","sinh","cosh","tanh","coth",
  "sin","cos","tan","cot","sec","csc",
  "log","ln","lg","exp","Exp"
];

const HWP_LITERAL_SUFFIXES_IN_TOKENIZER = new Set([
  "alpha","beta","gamma","delta","epsilon","zeta","eta","theta",
  "iota","kappa","lambda","mu","nu","xi","pi","rho","sigma","tau",
  "upsilon","phi","chi","psi","omega",
  "varepsilon","vartheta","varpi","varrho","varsigma","varphi"
]);

function canSplitHwpFunctionSuffix(ident) {
  return ident.length === 1
    || HWP_LITERAL_SUFFIXES_IN_TOKENIZER.has(ident)
    || HWP_TIGHT_FUNCTION_PREFIXES_IN_TOKENIZER.some(prefix => ident.startsWith(prefix) && ident.length > prefix.length);
}

function splitHwpFunctionIdentifier(ident) {
  const parts = [];
  let remaining = ident;

  while (remaining.length > 1) {
    const prefix = HWP_TIGHT_FUNCTION_PREFIXES_IN_TOKENIZER.find(name =>
      remaining.startsWith(name)
      && remaining.length > name.length
      && canSplitHwpFunctionSuffix(remaining.slice(name.length))
    );

    if (!prefix) break;

    parts.push(prefix);
    remaining = remaining.slice(prefix.length);
  }

  parts.push(remaining);
  return parts.length > 1 ? parts : null;
}

const HWP_SYMBOL_CHARS = "^_{}()#&~'`/,.-+=*\\[]<>|\"";
// Multi-character HWP operators, kept as one token only when written without spaces (longest first):
// <<< (⋘), >>> (⋙), <-> (↔), +- (±), -+ (∓), != and <> (≠), == (≡), << (≪), >> (≫),
// -> (→), <- (←), <= (≤), >= (≥), => (⇒). So "x<-1" is an arrow but "x < -1" is not.
const HWP_COMPOUND_SYMBOLS = [
  "<<<", ">>>", "<->", "+-", "-+", "!=", "==", "<<", ">>", "->", "<-", "<=", ">=", "<>", "=>"
];
// Bracket characters the HWP palette inserts after LEFT/RIGHT; each is its own token.
const HWP_UNICODE_DELIMITERS = "⌈⌉⌊⌋∥‖〈〉⟨⟩";

function tokenizeHwpEqn(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { tokens.push({ type: TokenType.SPACE, value: ch }); i++; continue; }
    if (ch === "\"") {
      const { value, end } = readQuotedTextContent(input, i + 1);
      tokens.push({ type: TokenType.SYMBOL, value: "\"" });
      tokens.push({ type: TokenType.TEXT, value });
      if (end < input.length && input[end] === "\"") tokens.push({ type: TokenType.SYMBOL, value: "\"" });
      i = Math.min(end + 1, input.length);
      continue;
    }
    if (isDigit(ch)) {
      let num = ch;
      i++;
      while (i < input.length && isDigit(input[i])) { num += input[i]; i++; }
      if (i < input.length && input[i] === "." && i + 1 < input.length && isDigit(input[i + 1])) {
        num += input[i];
        i++;
        while (i < input.length && isDigit(input[i])) { num += input[i]; i++; }
      }
      tokens.push({ type: TokenType.NUMBER, value: num });
      continue;
    }
    const compound = HWP_COMPOUND_SYMBOLS.find(symbol => input.startsWith(symbol, i));
    if (compound) {
      tokens.push({ type: TokenType.SYMBOL, value: compound });
      i += compound.length;
      continue;
    }
    if (HWP_SYMBOL_CHARS.includes(ch)) {
      if (ch === "\\" && i + 1 < input.length && input[i + 1] === "\\") {
        tokens.push({ type: TokenType.SYMBOL, value: "\\\\" });
        i += 2;
        continue;
      }
      tokens.push({ type: TokenType.SYMBOL, value: ch });
      i++;
      continue;
    }
    if (isIdentifierChar(ch)) {
      let ident = ch;
      i++;
      while (i < input.length && isIdentifierChar(input[i])) { ident += input[i]; i++; }
      const splitParts = splitHwpFunctionIdentifier(ident);
      const identifiers = splitParts || [ident];
      for (const part of identifiers) {
        const up = part.toUpperCase();
        if (lookupOwn(HWP_SCRIPT_WORDS, up)) tokens.push({ type: TokenType.SYMBOL, value: HWP_SCRIPT_WORDS[up] });
        else if (HWP_KEYWORDS.has(up)) tokens.push({ type: TokenType.KEYWORD, value: up });
        else tokens.push({ type: TokenType.IDENT, value: part });
      }
      continue;
    }
    if (HWP_UNICODE_DELIMITERS.includes(ch)) {
      tokens.push({ type: TokenType.IDENT, value: ch });
      i++;
      continue;
    }
    const { value, end } = readLiteralRun(input, i, HWP_SYMBOL_CHARS + HWP_UNICODE_DELIMITERS);
    if (value) {
      tokens.push({ type: TokenType.IDENT, value });
      i = end;
      continue;
    }
    tokens.push({ type: TokenType.UNKNOWN, value: ch });
    i++;
  }
  tokens.push({ type: TokenType.EOF, value: "" });
  return tokens;
}

function tokenizeLatex(input) {
  const tokens = [];
  let i = 0;
  const stopChars = "^_{}()#&~'/,.-+*=|[]\\<>\"";
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { tokens.push({ type: TokenType.SPACE, value: ch }); i++; continue; }
    if (ch === "\"") {
      const { value, end } = readQuotedTextContent(input, i + 1);
      tokens.push({ type: TokenType.SYMBOL, value: "\"" });
      tokens.push({ type: TokenType.TEXT, value });
      if (end < input.length && input[end] === "\"") tokens.push({ type: TokenType.SYMBOL, value: "\"" });
      i = Math.min(end + 1, input.length);
      continue;
    }
    if (isDigit(ch)) {
      let num = ch;
      i++;
      while (i < input.length && isDigit(input[i])) { num += input[i]; i++; }
      if (i < input.length && input[i] === "." && i + 1 < input.length && isDigit(input[i + 1])) {
        num += input[i];
        i++;
        while (i < input.length && isDigit(input[i])) { num += input[i]; i++; }
      }
      tokens.push({ type: TokenType.NUMBER, value: num });
      continue;
    }
    if ("^_{}()#&~'/,.-+*=|[]\\<>\"".includes(ch)) {
      if (ch === "\\" && i + 1 < input.length && input[i + 1] === "\\") {
        tokens.push({ type: TokenType.SYMBOL, value: "\\\\" });
        i += 2;
        continue;
      }
      if (ch === "\\") {
        i++;
        let cmd = "";
        while (i < input.length && /[A-Za-z]/.test(input[i])) { cmd += input[i]; i++; }
        const lower = lookupOwn(LATEX_KEYWORD_ALIASES, cmd) || cmd.toLowerCase();
        if (LATEX_IGNORED_COMMANDS.has(cmd)) {
          continue;
        } else if (lookupOwn(LATEX_EXTENSIBLE_ARROWS, cmd)) {
          tokens.push({ type: TokenType.KEYWORD, value: cmd });
        } else if (cmd.length > 0 && lower === "text" && input[i] === "{") {
          const { value, end } = readLatexTextContent(input, i + 1);
          tokens.push({ type: TokenType.KEYWORD, value: lower });
          tokens.push({ type: TokenType.SYMBOL, value: "{" });
          tokens.push({ type: TokenType.TEXT, value });
          if (end < input.length && input[end] === "}") tokens.push({ type: TokenType.SYMBOL, value: "}" });
          i = Math.min(end + 1, input.length);
        } else if (cmd.length > 0 && LATEX_KEYWORDS.has(lower)) {
          tokens.push({ type: TokenType.KEYWORD, value: lower });
        } else if (cmd.length > 0) {
          tokens.push({ type: TokenType.IDENT, value: cmd });
        } else if (i < input.length && "{}".includes(input[i])) {
          tokens.push({ type: TokenType.SYMBOL, value: input[i], escaped: true });
          i++;
        } else if (i < input.length && lookupOwn(LATEX_CONTROL_SYMBOLS, input[i]) !== undefined) {
          const name = LATEX_CONTROL_SYMBOLS[input[i]];
          if (name) tokens.push({ type: TokenType.IDENT, value: name });
          i++;
        } else {
          tokens.push({ type: TokenType.SYMBOL, value: "\\" });
        }
      } else {
        tokens.push({ type: TokenType.SYMBOL, value: ch });
        i++;
      }
      continue;
    }
    if (isIdentifierChar(ch)) {
      let ident = ch;
      i++;
      while (i < input.length && isIdentifierChar(input[i])) { ident += input[i]; i++; }
      tokens.push({ type: TokenType.IDENT, value: ident });
      continue;
    }
    const { value, end } = readLiteralRun(input, i, stopChars);
    if (value) {
      tokens.push({ type: TokenType.IDENT, value });
      i = end;
      continue;
    }
    tokens.push({ type: TokenType.UNKNOWN, value: ch });
    i++;
  }
  tokens.push({ type: TokenType.EOF, value: "" });
  return tokens;
}
