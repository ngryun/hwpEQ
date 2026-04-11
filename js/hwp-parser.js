// ═══════════════════════════════════════════════════════════
// HWP Equation Parser (recursive descent)
// ═══════════════════════════════════════════════════════════
class HwpParser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== TokenType.SPACE && t.type !== TokenType.UNKNOWN);
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos] || { type: TokenType.EOF, value: "" }; }
  next() { const t = this.peek(); if (t.type !== TokenType.EOF) this.pos++; return t; }
  matchSymbol(v) { const t = this.peek(); return t.type === TokenType.SYMBOL && t.value === v; }
  matchKeyword(v) { const t = this.peek(); return t.type === TokenType.KEYWORD && t.value === v; }

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
      return !["TIMES", "OVER", "ATOP", "CHOOSE", "REL", "BUILDREL", "RIGHT"].includes(kw);
    }
    if (t.type === TokenType.SYMBOL && (isOpenDelimiter(t.value) || t.value === "\"")) return true;
    return false;
  }

  tryParseCompoundSymbolOperator() {
    const t1 = this.peek();
    const t2 = this.tokens[this.pos + 1];
    const t3 = this.tokens[this.pos + 2];
    if (t1.type !== TokenType.SYMBOL) return null;
    const v1 = t1.value;
    const v2 = t2 && t2.type === TokenType.SYMBOL ? t2.value : "";
    const v3 = t3 && t3.type === TokenType.SYMBOL ? t3.value : "";
    if (v1 === "<" && v2 === "-" && v3 === ">") { this.pos += 3; return "<->"; }
    if (v1 === "-" && v2 === ">") { this.pos += 2; return "->"; }
    if (v1 === "<" && v2 === "-") { this.pos += 2; return "<-"; }
    if (v1 === "<" && v2 === "=") { this.pos += 2; return "<="; }
    if (v1 === ">" && v2 === "=") { this.pos += 2; return ">="; }
    if (v1 === "<" && v2 === ">") { this.pos += 2; return "<>"; }
    if (v1 === "=" && v2 === ">") { this.pos += 2; return "=>"; }
    if (["=", "<", ">"].includes(v1)) { this.pos += 1; return v1; }
    return null;
  }

  tryParseInfixRelationOperator() {
    const start = this.pos;
    const op = this.tryParseCompoundSymbolOperator();
    if (op) return op;
    this.pos = start;
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
    const op = this.tryParseCompoundSymbolOperator();
    if (op) return op;
    const t = this.peek();
    if (t.type === TokenType.IDENT || t.type === TokenType.KEYWORD || t.type === TokenType.SYMBOL) {
      this.next();
      return normalizeHwpOperator(t.value);
    }
    return "";
  }

  parseAnnotationArgument() {
    if (this.matchSymbol("{")) {
      this.next();
      const expr = this.parseExpression();
      if (this.matchSymbol("}")) this.next();
      return expr;
    }
    return this.parseFactor();
  }

  parseAdditive() {
    let node = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && (t.value === "+" || t.value === "-")) {
        const next = this.tokens[this.pos + 1];
        if (t.value === "-" && next && next.type === TokenType.SYMBOL && next.value === ">") break;
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
        if (kw === "OVER" || kw === "ATOP") {
          this.next();
          node = { type: "Fraction", numerator: node, denominator: this.parseFactor(), withBar: kw === "OVER" };
          continue;
        }
        if (kw === "CHOOSE") {
          this.next();
          node = { type: "Choose", total: node, choose: this.parseFactor() };
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

  parseFactor() {
    const fc = this.tryParseFunctionCall();
    if (fc) return fc;
    const t = this.peek();
    if (t.type === TokenType.SYMBOL && t.value === "+") {
      this.next();
      return { type: "UnaryOp", operator: "+", child: this.parseFactor() };
    }
    if (t.type === TokenType.SYMBOL && t.value === "-") {
      this.next();
      return { type: "UnaryOp", operator: "-", child: this.parseFactor() };
    }
    if (t.type === TokenType.NUMBER) { this.next(); return this.maybeParseSubSup({ type: "Literal", value: t.value }); }
    if (t.type === TokenType.IDENT) {
      this.next();
      return this.maybeParseSubSup(makeNameNode(t.value));
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
      if (kw === "INT" || kw === "OINT") {
        const node = { type: "Integral", variant: kw === "INT" ? "int" : "oint" };
        if (this.matchSymbol("_")) { this.next(); node.lower = this.parseSubOrSupContent(); }
        if (this.matchSymbol("^")) { this.next(); node.upper = this.parseSubOrSupContent(); }
        if (this.canStartFactor()) {
          node.body = this.parseFactor();
          if (node.body.type === "Bracket") node.body = this.removeBracket(node.body);
        }
        return node;
      }
      if (kw === "SUM") {
        const node = { type: "Summation" };
        if (this.matchSymbol("_")) { this.next(); node.lower = this.parseSubOrSupContent(); }
        if (this.matchSymbol("^")) { this.next(); node.upper = this.parseSubOrSupContent(); }
        if (this.canStartFactor()) {
          node.body = this.parseFactor();
          if (node.body && node.body.type === "Bracket") node.body = this.removeBracket(node.body);
        }
        return node;
      }
      if (kw === "BINOM") return this.parseChoosePrefix();
      if (kw === "BIGG") return { type: "SizedLiteral", size: "bigg", child: this.parseSizedTarget() };
      if (kw === "NOT") return { type: "Negation", child: this.parseFactor() };
      if (["RM","IT","BOLD","RMBOLD"].includes(kw)) return this.parseStyledPrefix(kw.toLowerCase());
      if (["ACUTE","GRAVE","DOT","DDOT","BAR","VEC","DYAD","UNDER","HAT","ARCH","CHECK","TILDE"].includes(kw)) {
        let child = this.parseFactor();
        if (child.type === "Bracket") child = this.removeBracket(child);
        return { type: "Decorated", decoType: kw.toLowerCase(), child };
      }
      if (kw === "LEFT") return this.parseLeftBracket();
      if (["MATRIX","PMATRIX","BMATRIX","DMATRIX","CASES","PILE","LPILE","RPILE","EQALIGN"].includes(kw)) {
        return this.parseEnv(kw.toLowerCase());
      }
      return this.maybeParseSubSup({ type: "Literal", value: kw });
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
      return makeNameNode(t.value);
    }
    if (t.type === TokenType.KEYWORD) {
      this.next();
      return makeNameNode(t.value);
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
      return this.maybeParseSubSup({ type: "BinaryOp", operator: "apply", left: makeNameNode(t1.value), right: this.parseLeftBracket() });
    }
    if (t2 && t2.type === TokenType.SYMBOL && isOpenDelimiter(t2.value)) {
      this.next();
      return this.maybeParseSubSup({ type: "BinaryOp", operator: "apply", left: makeNameNode(t1.value), right: this.parseBracketDirect() });
    }
    return undefined;
  }

  parseLeftBracket() {
    let leftDelim = "";
    const s = this.peek();
    if (s.type === TokenType.SYMBOL && isOpenDelimiter(s.value)) {
      leftDelim = "LEFT" + s.value;
      this.next();
    }
    const content = this.parseExpression();
    let rightDelim = "";
    if (this.matchKeyword("RIGHT")) {
      this.next();
      const s2 = this.peek();
      if (s2.type === TokenType.SYMBOL && isCloseDelimiter(s2.value)) {
        rightDelim = "RIGHT" + s2.value;
        this.next();
      }
    }
    if (leftDelim === "" && rightDelim === "") return content;
    return this.maybeParseSubSup(this.flattenBracket({ type: "Bracket", leftDelim, rightDelim, content }));
  }

  parseBracketDirect() {
    const open = this.next().value;
    const content = this.parseExpression();
    let right = "";
    if (matchingDelimiter(open) === this.peek().value) {
      right = this.next().value;
    }
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
    if (!this.matchSymbol("{")) return { type: "Literal", value: envName };
    this.next();
    const rows = splitHwpRows(this.tokens.slice(this.pos));
    let depth = 1;
    while (this.peek().type !== TokenType.EOF && depth > 0) {
      const tk = this.next();
      if (tk.type === TokenType.SYMBOL && isOpenDelimiter(tk.value)) depth++;
      else if (tk.type === TokenType.SYMBOL && isCloseDelimiter(tk.value)) depth--;
    }
    return this.maybeParseSubSup({ type: "BeginEnv", envName, rows, alignSpec });
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

  maybeParseSubSup(base) {
    let node = base;
    while (true) {
      if (this.matchSymbol("^")) {
        this.next();
        node = { type: "Superscript", base: node, exponent: this.parseSubOrSupContent() };
        continue;
      }
      if (this.matchSymbol("_")) {
        this.next();
        node = { type: "Subscript", base: node, sub: this.parseSubOrSupContent() };
        continue;
      }
      break;
    }
    return node;
  }

  parseSubOrSupContent() {
    if (this.matchSymbol("{")) {
      this.next();
      const expr = this.parseExpression();
      if (this.matchSymbol("}")) this.next();
      return expr;
    }
    return this.parseSingleFactorNoSubSup();
  }

  parseSingleFactorNoSubSup() {
    const t = this.peek();
    if (t.type !== TokenType.EOF) {
      this.next();
      return { type: "Literal", value: t.value };
    }
    return { type: "Literal", value: "" };
  }
}
