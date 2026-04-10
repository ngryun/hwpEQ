// ═══════════════════════════════════════════════════════════
// Tokenizer & Token Types
// ═══════════════════════════════════════════════════════════
const TokenType = { KEYWORD: 0, IDENT: 1, NUMBER: 2, SYMBOL: 3, SPACE: 4, EOF: 5, UNKNOWN: 6 };

function isAlpha(ch) { return /^[A-Za-z]$/.test(ch); }
function isDigit(ch) { return /^[0-9]$/.test(ch); }
function isOpenDelimiter(ch) { return "([{|".includes(ch); }
function isCloseDelimiter(ch) { return ")]}|".includes(ch); }
function matchingDelimiter(ch) {
  return { "(": ")", "[": "]", "{": "}", "|": "|" }[ch] || "";
}

const HWP_KEYWORDS = new Set([
  "TIMES","OVER","ATOP","SQRT","INT","OINT","SUM","PROD","LIM",
  "UNION","INTER","SMALLUNION","SMALLINTER",
  "ACUTE","GRAVE","DOT","DDOT","BAR","VEC","DYAD","UNDER",
  "HAT","ARCH","CHECK","TILDE","LEFT","RIGHT",
  "MATRIX","PMATRIX","BMATRIX","DMATRIX","CASES",
  "PILE","LPILE","RPILE","EQALIGN",
  "CHOOSE","BINOM","NOT","REL","BUILDREL","BIGG","COL","LCOL","RCOL",
  "RM","IT","BOLD","RMBOLD",
  "ROOT","OF"
]);

const LATEX_KEYWORDS = new Set([
  "int","oint","sum","prod","sqrt","frac","over","atop","choose","binom","lim",
  "acute","grave","dot","ddot","bar","vec","hat","tilde","check",
  "widehat","widetilde","overparen","underline","overline","overrightarrow","overleftrightarrow",
  "times","left","right","begin","end","not","bigg","biggl","biggr","biggm",
  "overset","underset","text","mathrm","mathit","mathbf","boldsymbol","operatorname"
]);

function tokenizeHwpEqn(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { tokens.push({ type: TokenType.SPACE, value: ch }); i++; continue; }
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
    if ("^_{}()#&~'/,.-+=*\\[]<>|\"".includes(ch)) {
      if (ch === "\\" && i + 1 < input.length && input[i + 1] === "\\") {
        tokens.push({ type: TokenType.SYMBOL, value: "\\\\" });
        i += 2;
        continue;
      }
      tokens.push({ type: TokenType.SYMBOL, value: ch });
      i++;
      continue;
    }
    if (isAlpha(ch)) {
      let ident = ch;
      i++;
      while (i < input.length && isAlpha(input[i])) { ident += input[i]; i++; }
      const up = ident.toUpperCase();
      if (HWP_KEYWORDS.has(up)) tokens.push({ type: TokenType.KEYWORD, value: up });
      else tokens.push({ type: TokenType.IDENT, value: ident });
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
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { tokens.push({ type: TokenType.SPACE, value: ch }); i++; continue; }
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
        const lower = cmd.toLowerCase();
        if (cmd.length > 0 && LATEX_KEYWORDS.has(lower)) tokens.push({ type: TokenType.KEYWORD, value: lower });
        else if (cmd.length > 0) tokens.push({ type: TokenType.IDENT, value: cmd });
        else tokens.push({ type: TokenType.SYMBOL, value: "\\" });
      } else {
        tokens.push({ type: TokenType.SYMBOL, value: ch });
        i++;
      }
      continue;
    }
    if (isAlpha(ch)) {
      let ident = ch;
      i++;
      while (i < input.length && isAlpha(input[i])) { ident += input[i]; i++; }
      tokens.push({ type: TokenType.IDENT, value: ident });
      continue;
    }
    tokens.push({ type: TokenType.UNKNOWN, value: ch });
    i++;
  }
  tokens.push({ type: TokenType.EOF, value: "" });
  return tokens;
}
