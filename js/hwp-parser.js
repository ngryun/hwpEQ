// ═══════════════════════════════════════════════════════════
// HWP Equation Parser (recursive descent)
// ═══════════════════════════════════════════════════════════
const HWP_ADDITIVE_OPERATORS = ["+", "-", "+-", "-+"];
const HWP_NON_FACTOR_SYMBOLS = new Set([...HWP_ADDITIVE_OPERATORS, ...RELATION_OPERATORS, "/", "^", "_", "&", "#", "\\\\"]);
const HWP_DECORATION_KEYWORDS = [
  "ACUTE","GRAVE","DOT","DDOT","BAR","VEC","DYAD","UNDER","HAT","ARCH","CHECK","TILDE",
  "OVERLINE","UNDERLINE","BOX"
];
// Operators that take limits written as "from a to b" as well as "_a ^b".
const HWP_LIMIT_KEYWORDS = ["PROD","LIM","UNION","INTER"];
const HWP_FRACTION_KEYWORDS = ["OVER","ATOP","CHOOSE"];
// Keywords that end a term ("항") even when written without a space before them.
const HWP_TERM_BREAK_KEYWORDS = new Set([...HWP_FRACTION_KEYWORDS, "RIGHT","OF","RM","IT","LSUB","LSUP"]);
// Commands whose argument stays in the same term even after a space ("sqrt 2", "bar {AB}").
const HWP_ARGUMENT_KEYWORDS = new Set([
  ...HWP_DECORATION_KEYWORDS, "SQRT","ROOT","BOLD","RMBOLD","NOT","BIGG","BINOM",
  "MATRIX","PMATRIX","BMATRIX","DMATRIX","CASES","PILE","LPILE","RPILE","EQALIGN",
  "COLOR","LADDER","SLADDER","LONGDIV","OVERBRACE","UNDERBRACE"
]);

// The delimiter a token stands for after LEFT or RIGHT ("" if it is not one): a bracket symbol,
// "." for an invisible delimiter, or a named one (< >, lceil, VERT, ⌈ ...) as its LaTeX delimiter.
function hwpSizedDelimiter(token) {
  if (token.type === TokenType.SYMBOL && (isOpenDelimiter(token.value) || isCloseDelimiter(token.value) || token.value === ".")) return token.value;
  if (token.type === TokenType.SYMBOL || token.type === TokenType.IDENT) return hwpNamedDelimiter(token.value);
  return "";
}

class HwpParser {
  // HWP separates terms by whitespace, so each token remembers whether a space came before it.
  constructor(tokens) {
    this.tokens = [];
    let spaceBefore = false;
    for (const token of tokens) {
      if (token.type === TokenType.SPACE) spaceBefore = true;
      if (token.type === TokenType.SPACE || token.type === TokenType.UNKNOWN) continue;
      if (spaceBefore) token.spaceBefore = true;
      spaceBefore = false;
      this.tokens.push(token);
    }
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos] || { type: TokenType.EOF, value: "" }; }
  next() { const t = this.peek(); if (t.type !== TokenType.EOF) this.pos++; return t; }
  matchSymbol(v) { const t = this.peek(); return t.type === TokenType.SYMBOL && t.value === v; }
  matchKeyword(v) { const t = this.peek(); return t.type === TokenType.KEYWORD && t.value === v; }

  parse() { return parseCompleteExpression(this); }
  parseExpression() { return this.parseLineBreak(); }

  parseLineBreak() {
    let node = this.parseRelation();
    while (this.matchSymbol("#")) {
      this.next();
      node = { type: "BinaryOp", operator: "#", left: node, right: this.parseRelation() };
    }
    return node;
  }

  canStartFactor() {
    const t = this.peek();
    if (t.type === TokenType.NUMBER) return true;
    if (t.type === TokenType.IDENT) return !RELATION_OPERATORS.has(normalizeHwpOperator(t.value));
    if (t.type === TokenType.KEYWORD) {
      const kw = t.value;
      if (RELATION_OPERATORS.has(normalizeHwpOperator(kw))) return false;
      return !["TIMES", "OVER", "ATOP", "CHOOSE", "REL", "BUILDREL", "RIGHT", "LSUB", "LSUP"].includes(kw);
    }
    if (t.type === TokenType.SYMBOL) {
      if (isOpenDelimiter(t.value) || t.value === "\"") return true;
      return !HWP_NON_FACTOR_SYMBOLS.has(t.value) && !isCloseDelimiter(t.value);
    }
    return false;
  }

  // The tokenizer already joined multi-character operators such as -> and <=.
  tryParseSymbolRelation() {
    const t = this.peek();
    if (t.type !== TokenType.SYMBOL || !RELATION_OPERATORS.has(t.value)) return null;
    this.next();
    return t.value;
  }

  tryParseInfixRelationOperator() {
    const op = this.tryParseSymbolRelation();
    if (op) return op;
    const t = this.peek();
    if (t.type === TokenType.IDENT || t.type === TokenType.KEYWORD) {
      const normalized = normalizeHwpOperator(t.value);
      if (RELATION_OPERATORS.has(normalized)) {
        this.next();
        return normalized;
      }
    }
    return null;
  }

  parseRelation() {
    let node = this.parseAdditive();
    while (true) {
      if (this.matchKeyword("REL") || this.matchKeyword("BUILDREL")) {
        node = this.parseAnnotatedRelation(node);
        continue;
      }
      const op = this.tryParseInfixRelationOperator();
      if (!op) break;
      const right = this.parseAdditive();
      node = { type: "BinaryOp", operator: op, left: node, right };
    }
    return node;
  }

  parseAnnotatedRelation(left) {
    const buildOnly = this.next().value === "BUILDREL";
    const arrow = this.parseRelationSymbol();
    const above = this.parseAnnotationArgument();
    const below = buildOnly ? null : this.parseAnnotationArgument();
    const right = this.parseAdditive();
    return { type: "Relation", left, arrow, above, below, right };
  }

  parseRelationSymbol() {
    const op = this.tryParseSymbolRelation();
    if (op) return op;
    const t = this.peek();
    if (t.type === TokenType.IDENT || t.type === TokenType.KEYWORD || t.type === TokenType.SYMBOL) {
      this.next();
      return normalizeHwpOperator(t.value);
    }
    return "";
  }

  parseAnnotationArgument() {
    if (this.matchSymbol("{")) return this.parseBracedExpression();
    return this.parseFactor();
  }

  // Parses "{ ... }" from its opening brace; "{}" is an empty literal.
  parseBracedExpression() {
    this.next();
    if (this.matchSymbol("}")) {
      this.next();
      return { type: "Literal", value: "" };
    }
    const expr = this.parseExpression();
    if (this.matchSymbol("}")) this.next();
    return expr;
  }

  parseAdditive() {
    let node = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && HWP_ADDITIVE_OPERATORS.includes(t.value)) {
        this.next();
        const right = this.parseTerm();
        node = { type: "BinaryOp", operator: t.value, left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  parseTerm() {
    let node = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.KEYWORD) {
        const kw = t.value;
        if (kw === "TIMES") {
          this.next();
          node = { type: "BinaryOp", operator: "times", left: node, right: this.parseFactor() };
          continue;
        }
        if (HWP_FRACTION_KEYWORDS.includes(kw)) {
          // Reached only when the term in front ended in a command that took spaced arguments
          // (tryParseTermFraction handles the rest); that last factor is the left operand.
          if (node.type === "BinaryOp" && node.operator === "") node = { ...node, right: this.finishFraction(node.right) };
          else node = this.finishFraction(node);
          continue;
        }
      }
      if (t.type === TokenType.SYMBOL && t.value === "/") {
        this.next();
        node = { type: "BinaryOp", operator: "/", left: node, right: this.parseFactor() };
        continue;
      }
      if (this.canStartFactor()) {
        node = { type: "BinaryOp", operator: "", left: node, right: this.parseFactor() };
        continue;
      }
      break;
    }
    return node;
  }

  isSymbolAt(index, values) {
    const t = this.tokens[index];
    return !!t && t.type === TokenType.SYMBOL && values.includes(t.value);
  }

  isFractionKeywordAt(index) {
    const t = this.tokens[index];
    return !!t && t.type === TokenType.KEYWORD && HWP_FRACTION_KEYWORDS.includes(t.value);
  }

  // Index just past the "{...}" group or bracket pair opening at `start`; -1 if it is never closed.
  findBracketEnd(start) {
    const bracesOnly = this.tokens[start].value === "{";
    let curly = 0;
    let round = 0;
    for (let i = start; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === TokenType.KEYWORD && (t.value === "LEFT" || t.value === "RIGHT")) {
        i++; // the delimiter after LEFT/RIGHT pairs with its partner, not with a plain bracket
        continue;
      }
      if (t.type !== TokenType.SYMBOL) continue;
      if (t.value === "{") curly++;
      else if (t.value === "}") curly--;
      else if (curly === 0 && !bracesOnly && (t.value === "(" || t.value === "[")) round++;
      else if (curly === 0 && !bracesOnly && (t.value === ")" || t.value === "]")) round--;
      else continue;
      if (curly < 0) return -1;
      if (curly === 0 && round === 0) return i + 1;
    }
    return -1;
  }

  // Index just past "LEFT ... RIGHT" and its closing delimiter; -1 if RIGHT is missing.
  findLeftRightEnd(start) {
    let depth = 0;
    for (let i = start; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type !== TokenType.KEYWORD) continue;
      if (t.value === "LEFT") depth++;
      else if (t.value === "RIGHT" && --depth === 0) {
        const delimiter = this.tokens[i + 1];
        return delimiter && hwpSizedDelimiter(delimiter) ? i + 2 : i + 1;
      }
    }
    return -1;
  }

  // Index just past the token at `index`, or past the whole group, bracket pair or LEFT ... RIGHT it opens.
  skipAtom(index) {
    let end = -1;
    if (this.isSymbolAt(index, ["{", "(", "["])) end = this.findBracketEnd(index);
    else if (this.tokens[index].type === TokenType.KEYWORD && this.tokens[index].value === "LEFT") end = this.findLeftRightEnd(index);
    return end < 0 ? index + 1 : end;
  }

  // True when the token after `previous` is that command's argument, which a space does not detach.
  isCommandArgument(previous) {
    return previous.type === TokenType.KEYWORD && HWP_ARGUMENT_KEYWORDS.has(previous.value);
  }

  // Index just past the term ("항") starting at `start`. HWP ends a term at whitespace, except inside
  // brackets and command arguments; scripts stay attached even across a space. A "{...}" group is a
  // term by itself (plus its scripts), and so are a font switch and a leading space mark.
  findTermEnd(start) {
    const first = this.tokens[start];
    if (!first || first.type === TokenType.EOF) return start;
    const isFontSwitch = first.type === TokenType.KEYWORD && (first.value === "RM" || first.value === "IT");
    if (isFontSwitch || this.isSymbolAt(start, ["~", "`"])) return start + 1;
    const groupOnly = this.isSymbolAt(start, ["{"]);
    let i = start;
    let previous = null;
    while (true) {
      const t = this.tokens[i];
      if (!t || t.type === TokenType.EOF) break;
      if (this.isSymbolAt(i, ["^", "_"])) {
        i = this.findScriptOperandEnd(i + 1, t.value === "^" ? "_" : "^");
        previous = t;
        continue;
      }
      if (i > start) {
        if (this.isSymbolAt(i, ["}", ")", "]", "#", "&", "`"])) break;
        if (t.type === TokenType.KEYWORD && HWP_TERM_BREAK_KEYWORDS.has(t.value)) break;
        if (!this.isCommandArgument(previous) && (t.spaceBefore || groupOnly || this.isSymbolAt(i, ["{"]))) break;
      }
      i = this.skipAtom(i);
      previous = t;
    }
    return i;
  }

  // Index just past the script operand starting at `start`: a "{...}" group, or else everything up to
  // the next space ("x^2n" is x^{2n}, "a^2+b^2" is a^{2+b^{2}}). An unbraced operand also stops at
  // `opposite`, the other script mark, which then belongs to the same base ("sum_n=1^N").
  findScriptOperandEnd(start, opposite) {
    if (this.isSymbolAt(start, ["{"])) return this.skipAtom(start);
    let i = start;
    let previous = null;
    while (true) {
      const t = this.tokens[i];
      if (!t || t.type === TokenType.EOF) break;
      if (this.isSymbolAt(i, ["}", ")", "]", "~", "`", "#", "&"])) break;
      if (opposite && this.isSymbolAt(i, [opposite])) break;
      if (t.type === TokenType.KEYWORD && HWP_TERM_BREAK_KEYWORDS.has(t.value)) break;
      if (i > start) {
        if (!this.isCommandArgument(previous) && (t.spaceBefore || this.isSymbolAt(i, ["{"]))) break;
        // "^3sqrt{x}" is the spec's cube root: the root is not part of the raised 3.
        if (t.type === TokenType.KEYWORD && (t.value === "SQRT" || t.value === "ROOT")) break;
      }
      if (this.isSymbolAt(i, ["^", "_"])) {
        if (i === start) break;
        i = this.findScriptOperandEnd(i + 1, null); // a further script nests on the item before it
        previous = t;
        continue;
      }
      i = this.skipAtom(i);
      previous = t;
    }
    // Punctuation closing the operand reads as following the script: "(x_1, x_2)", but "a_1,2".
    while (i - 1 > start && this.isSymbolAt(i - 1, [",", "."])) i--;
    return i;
  }

  // Parses the tokens up to `end` as an expression of their own.
  parseSpan(end) {
    if (end <= this.pos) return { type: "Literal", value: "" };
    const node = parseTokenSlice(HwpParser, this.tokens.slice(this.pos, end));
    this.pos = end;
    return node;
  }

  // "a over b" works on the terms either side of it: "2 a over b" is 2(a/b), "a+b over c" is (a+b)/c.
  // Called where a term may start; returns null unless that term is followed by OVER, ATOP or CHOOSE.
  tryParseTermFraction() {
    const end = this.isFractionKeywordAt(this.pos) ? this.pos : this.findTermEnd(this.pos);
    if (!this.isFractionKeywordAt(end)) return null;
    let node = this.parseSpan(end);
    while (this.isFractionKeywordAt(this.pos)) node = this.finishFraction(node);
    return node;
  }

  // Consumes OVER, ATOP or CHOOSE and the term after it. A "{...}" operand stands for its contents.
  finishFraction(left) {
    const kw = this.next().value;
    const right = this.parseSpan(this.findTermEnd(this.pos));
    const [upper, lower] = [left, right].map(node => (node.type === "Bracket" ? this.removeBracket(node) : node));
    if (kw === "CHOOSE") return { type: "Choose", total: upper, choose: lower };
    return { type: "Fraction", numerator: upper, denominator: lower, withBar: kw === "OVER" };
  }

  parseFactor() {
    const fraction = this.tryParseTermFraction();
    if (fraction) return fraction;
    const fc = this.tryParseFunctionCall();
    if (fc) return fc;
    const t = this.peek();
    if (t.type === TokenType.SYMBOL && HWP_ADDITIVE_OPERATORS.includes(t.value)) {
      this.next();
      return { type: "UnaryOp", operator: t.value, child: this.parseFactor() };
    }
    if (t.type === TokenType.NUMBER) { this.next(); return this.maybeParseSubSup({ type: "Literal", value: t.value }); }
    if (t.type === TokenType.IDENT) {
      this.next();
      return this.maybeParseSubSup(makeHwpNameNode(t.value));
    }
    if (t.type === TokenType.KEYWORD) {
      this.next();
      const kw = t.value;
      if (kw === "SQRT") {
        let rad = this.parseFactor();
        if (rad.type === "Bracket") rad = this.removeBracket(rad);
        return { type: "Root", radicand: rad };
      }
      if (kw === "ROOT") {
        let index = this.parseFactor();
        if (index.type === "Bracket") index = this.removeBracket(index);
        if (this.matchKeyword("OF")) this.next();
        let rad = this.parseFactor();
        if (rad.type === "Bracket") rad = this.removeBracket(rad);
        return { type: "Root", radicand: rad, index };
      }
      const integral = lookupOwn(HWP_INTEGRAL_KEYWORDS, kw);
      if (integral) {
        const node = { type: "Integral", variant: integral };
        this.parseLimits(node);
        if (this.canStartFactor()) {
          node.body = this.parseFactor();
          if (node.body.type === "Bracket") node.body = this.removeBracket(node.body);
        }
        return node;
      }
      if (kw === "SUM" || kw === "SMALLSUM") {
        const node = { type: "Summation" };
        this.parseLimits(node);
        if (this.canStartFactor()) {
          node.body = this.parseFactor();
          if (node.body && node.body.type === "Bracket") node.body = this.removeBracket(node.body);
        }
        return node;
      }
      if (kw === "BINOM") return this.parseChoosePrefix();
      if (kw === "BIGG") return { type: "SizedLiteral", size: "bigg", child: this.parseSizedTarget() };
      if (kw === "NOT") return { type: "Negation", child: this.parseFactor() };
      if (kw === "RM" || kw === "IT") return this.parseFontSwitch(kw.toLowerCase());
      if (kw === "BOLD" || kw === "RMBOLD") return this.parseStyledPrefix(kw.toLowerCase());
      if (HWP_DECORATION_KEYWORDS.includes(kw)) {
        let child = this.parseFactor();
        if (child.type === "Bracket") child = this.removeBracket(child);
        return { type: "Decorated", decoType: kw.toLowerCase(), child };
      }
      if (kw === "OVERBRACE" || kw === "UNDERBRACE") {
        const node = { type: "Brace", over: kw === "OVERBRACE", child: this.parseAnnotationArgument() };
        if (this.matchSymbol("{")) node.note = this.parseBracedExpression();
        return node;
      }
      if (kw === "SCALE") return this.parseScale();
      if (kw === "COLOR") return this.parseColor();
      if (kw === "LADDER" || kw === "SLADDER") {
        const rows = this.parseRowGroup();
        return rows ? { type: "Ladder", kind: kw.toLowerCase(), rows } : { type: "Literal", value: kw };
      }
      if (kw === "LONGDIV") return this.parseLongDivision();
      if (kw === "LSUB" || kw === "LSUP") {
        // No base in front: the script hangs on an empty one.
        this.pos--;
        return this.maybeParseSubSup({ type: "Literal", value: "" });
      }
      if (kw === "LEFT") return this.parseLeftBracket();
      if (["MATRIX","PMATRIX","BMATRIX","DMATRIX","CASES","PILE","LPILE","RPILE","EQALIGN"].includes(kw)) {
        return this.parseEnv(kw.toLowerCase());
      }
      return this.maybeParseSubSup({ type: "Literal", value: kw }, HWP_LIMIT_KEYWORDS.includes(kw));
    }
    if (t.type === TokenType.SYMBOL) {
      if (t.value === "\"") return this.parseQuotedText();
      if (isOpenDelimiter(t.value)) return this.parseBracketDirect();
      if (isCloseDelimiter(t.value)) { this.next(); return { type: "Literal", value: t.value }; }
      this.next();
      return { type: "Literal", value: t.value };
    }
    this.next();
    return { type: "Literal", value: "" };
  }

  parseChoosePrefix() {
    const total = this.parseAnnotationArgument();
    const choose = this.parseAnnotationArgument();
    return { type: "Choose", total, choose };
  }

  matchLimitWord(word) {
    const t = this.peek();
    return t.type === TokenType.IDENT && t.value.toLowerCase() === word;
  }

  // Limits of a big operator, in either order: "_a ^b" or "from a to b".
  parseLimits(node) {
    while (true) {
      if (this.matchSymbol("_") || this.matchLimitWord("from")) {
        this.next();
        node.lower = this.parseSubOrSupContent(node.upper ? null : "^");
      } else if (this.matchSymbol("^") || this.matchLimitWord("to")) {
        this.next();
        node.upper = this.parseSubOrSupContent(node.lower ? null : "_");
      } else {
        return;
      }
    }
  }

  // "scale N" resizes everything up to the end of the enclosing group.
  parseScale() {
    const percent = this.peek().type === TokenType.NUMBER ? Number(this.next().value) : 100;
    const atGroupEnd = this.peek().type === TokenType.EOF || this.matchSymbol("}");
    const child = atGroupEnd ? { type: "Literal", value: "" } : this.parseExpression();
    return { type: "Scaled", percent, child };
  }

  // "COLOR {R,G,B} {body}"; a colour that is not three numbers is ignored.
  parseColor() {
    let spec = "";
    if (this.matchSymbol("{")) {
      this.next();
      while (!this.matchSymbol("}") && this.peek().type !== TokenType.EOF) spec += this.next().value;
      if (this.matchSymbol("}")) this.next();
    }
    const child = this.parseAnnotationArgument();
    const rgb = parseLatexColor("RGB", spec);
    return rgb ? { type: "Colored", rgb, child } : child;
  }

  // "LONGDIV {divisor} {quotient} {dividend # step # ...}"
  parseLongDivision() {
    if (!this.matchSymbol("{")) return { type: "Literal", value: "LONGDIV" };
    const divisor = this.parseBracedExpression();
    const quotient = this.matchSymbol("{") ? this.parseBracedExpression() : { type: "Literal", value: "" };
    const rows = this.parseRowGroup() || [[{ type: "Literal", value: "" }]];
    return { type: "LongDivision", divisor, quotient, rows };
  }

  // rm and it switch the font for the rest of the enclosing group ("rm 2H_2 O" is all upright).
  parseFontSwitch(style) {
    const atGroupEnd = this.peek().type === TokenType.EOF || this.matchSymbol("}");
    const child = atGroupEnd ? { type: "Literal", value: "" } : this.parseExpression();
    return { type: "Styled", style, child };
  }

  // bold and rmbold style only the item after them.
  parseStyledPrefix(style) {
    let child = this.parseStyleArgument();
    if (child && child.type === "Bracket" && child.leftDelim === "{") child = this.removeBracket(child);
    return this.maybeParseSubSup({ type: "Styled", style, child });
  }

  parseStyleArgument() {
    if (this.matchSymbol("{")) return this.parseSubOrSupContent();
    const t = this.peek();
    if (t.type === TokenType.NUMBER) {
      this.next();
      return { type: "Literal", value: t.value };
    }
    if (t.type === TokenType.IDENT) {
      this.next();
      return makeHwpNameNode(t.value);
    }
    if (t.type === TokenType.KEYWORD) {
      this.next();
      return makeHwpNameNode(t.value);
    }
    if (t.type === TokenType.SYMBOL && t.value === "\"") return this.parseQuotedText();
    if (t.type === TokenType.SYMBOL && isOpenDelimiter(t.value)) return this.parseBracketDirect();
    if (t.type !== TokenType.EOF) {
      this.next();
      return { type: "Literal", value: t.value };
    }
    return { type: "Literal", value: "" };
  }

  parseSizedTarget() {
    const t = this.peek();
    if (t.type === TokenType.SYMBOL || t.type === TokenType.IDENT || t.type === TokenType.KEYWORD || t.type === TokenType.NUMBER) {
      this.next();
      return { type: "Literal", value: t.value };
    }
    return { type: "Literal", value: "" };
  }

  parseQuotedText() {
    this.next();
    let value = "";
    while (!this.matchSymbol("\"") && this.peek().type !== TokenType.EOF) {
      value += this.next().value;
    }
    if (this.matchSymbol("\"")) this.next();
    return this.maybeParseSubSup({ type: "Text", value });
  }

  tryParseFunctionCall() {
    const t1 = this.peek();
    const t2 = this.tokens[this.pos + 1];
    if (t1.type !== TokenType.IDENT) return undefined;
    if (t2 && t2.type === TokenType.KEYWORD && t2.value === "LEFT") {
      this.next();
      return this.maybeParseSubSup({ type: "BinaryOp", operator: "apply", left: makeHwpNameNode(t1.value), right: this.parseLeftBracket() });
    }
    if (t2 && t2.type === TokenType.SYMBOL && isOpenDelimiter(t2.value)) {
      this.next();
      return this.maybeParseSubSup({ type: "BinaryOp", operator: "apply", left: makeHwpNameNode(t1.value), right: this.parseBracketDirect() });
    }
    return undefined;
  }

  parseLeftBracket() {
    const leftDelim = this.parseSizedDelimiter();
    const content = this.parseExpression();
    let rightDelim = "";
    if (this.matchKeyword("RIGHT")) {
      this.next();
      rightDelim = this.parseSizedDelimiter();
    }
    if (leftDelim === "" && rightDelim === "") return content;
    // A missing side becomes the invisible delimiter "." so LEFT/RIGHT always stay paired.
    return this.maybeParseSubSup(this.flattenBracket({
      type: "Bracket",
      leftDelim: `LEFT${leftDelim || "."}`,
      rightDelim: `RIGHT${rightDelim || "."}`,
      content
    }));
  }

  parseSizedDelimiter() {
    const delim = hwpSizedDelimiter(this.peek());
    if (delim) this.next();
    return delim;
  }

  parseBracketDirect() {
    const open = this.next().value;
    const isEmpty = this.peek().type === TokenType.SYMBOL && closesBracket(open, this.peek().value);
    const content = isEmpty ? { type: "Literal", value: "" } : this.parseExpression();
    let right = "";
    const close = this.peek();
    if (close.type === TokenType.SYMBOL && closesBracket(open, close.value)) {
      right = this.next().value;
    }
    // "{rm A}" only limits how far the font switch reaches; the styled node carries its own braces.
    const isFontGroup = open === "{" && right === "}" && content.type === "Styled" && (content.style === "rm" || content.style === "it");
    if (isFontGroup) return this.maybeParseSubSup(content);
    return this.maybeParseSubSup(this.flattenBracket({ type: "Bracket", leftDelim: open, rightDelim: right, content }));
  }

  flattenBracket(br) {
    if (br.content.type === "Bracket") {
      const inner = br.content;
      if (br.leftDelim === inner.leftDelim && br.rightDelim === inner.rightDelim && (br.leftDelim === "{" || br.leftDelim === "")) return inner;
    }
    return br;
  }

  removeBracket(br) {
    if (br.leftDelim === "{" || br.leftDelim === "") return br.content;
    return br;
  }

  parseEnv(envName) {
    if (isHwpMatrixEnvName(envName)) {
      if (this.peek().type === TokenType.KEYWORD && ["COL","LCOL","RCOL"].includes(this.peek().value)) {
        return this.parseMatrixColumnEnv(envName, false);
      }
      if (this.matchSymbol("{")) {
        const nextToken = this.tokens[this.pos + 1];
        if (nextToken && nextToken.type === TokenType.KEYWORD && ["COL","LCOL","RCOL"].includes(nextToken.value)) {
          return this.parseMatrixColumnEnv(envName, true);
        }
      }
    }

    let alignSpec = null;
    if (this.peek().type === TokenType.KEYWORD && ["COL","LCOL","RCOL"].includes(this.peek().value)) {
      const kw = this.next().value;
      alignSpec = hwpColumnKeywordToAlign(kw);
    }
    const rows = this.parseRowGroup();
    if (!rows) return { type: "Literal", value: envName };
    return this.maybeParseSubSup({ type: "BeginEnv", envName, rows, alignSpec });
  }

  // "{a & b # c & d}" as rows of cells; null when no group follows.
  parseRowGroup() {
    if (!this.matchSymbol("{")) return null;
    this.next();
    const rows = splitHwpRows(this.tokens.slice(this.pos));
    let depth = 1;
    while (this.peek().type !== TokenType.EOF && depth > 0) {
      const tk = this.next();
      if (tk.type === TokenType.SYMBOL && isOpenDelimiter(tk.value)) depth++;
      else if (tk.type === TokenType.SYMBOL && isCloseDelimiter(tk.value)) depth--;
    }
    return rows;
  }

  parseMatrixColumnEnv(envName, wrapped) {
    if (wrapped && this.matchSymbol("{")) this.next();
    const columns = [];
    while (this.peek().type === TokenType.KEYWORD && ["COL","LCOL","RCOL"].includes(this.peek().value)) {
      columns.push(this.parseMatrixColumnGroup());
    }
    if (wrapped && this.matchSymbol("}")) this.next();
    const { rows, columnAlignSpec } = transposeHwpMatrixColumns(columns);
    return this.maybeParseSubSup({ type: "BeginEnv", envName, rows, columnAlignSpec, columnMode: true });
  }

  parseMatrixColumnGroup() {
    const alignKeyword = this.next().value;
    if (!this.matchSymbol("{")) {
      return { align: hwpColumnKeywordToAlign(alignKeyword), entries: [{ type: "Literal", value: "" }] };
    }
    this.next();
    const tokens = [];
    let depth = 1;
    while (this.peek().type !== TokenType.EOF && depth > 0) {
      const tk = this.next();
      if (tk.type === TokenType.SYMBOL && isOpenDelimiter(tk.value)) {
        depth++;
        tokens.push(tk);
        continue;
      }
      if (tk.type === TokenType.SYMBOL && isCloseDelimiter(tk.value)) {
        depth--;
        if (depth === 0) break;
        tokens.push(tk);
        continue;
      }
      tokens.push(tk);
    }
    return {
      align: hwpColumnKeywordToAlign(alignKeyword),
      entries: splitHwpColumnEntries(tokens)
    };
  }

  // allowLimitWords: the base is a big operator, so "from"/"to" also attach scripts.
  maybeParseSubSup(base, allowLimitWords = false) {
    let node = base;
    let hasSub = false;
    let hasSup = false;
    while (true) {
      if (this.matchSymbol("^") || (allowLimitWords && this.matchLimitWord("to"))) {
        this.next();
        node = { type: "Superscript", base: node, exponent: this.parseSubOrSupContent(hasSub ? null : "_") };
        hasSup = true;
        continue;
      }
      if (this.matchSymbol("_") || (allowLimitWords && this.matchLimitWord("from"))) {
        this.next();
        node = { type: "Subscript", base: node, sub: this.parseSubOrSupContent(hasSup ? null : "^") };
        hasSub = true;
        continue;
      }
      if (this.matchKeyword("LSUB") || this.matchKeyword("LSUP")) {
        const side = this.next().value === "LSUB" ? "sub" : "sup";
        node = { type: "Prescript", base: node, [side]: this.parseSubOrSupContent() };
        continue;
      }
      break;
    }
    return node;
  }

  // A script operand: a "{...}" group, or else everything up to the next space. `opposite` is the
  // other script mark while the base can still take it, so "x_1^2" gives x both scripts.
  parseSubOrSupContent(opposite = null) {
    if (this.matchSymbol("{")) return this.parseBracedExpression();
    return this.parseSpan(this.findScriptOperandEnd(this.pos, opposite));
  }
}
