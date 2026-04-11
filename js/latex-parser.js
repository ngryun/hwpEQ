// ═══════════════════════════════════════════════════════════
// LaTeX Parser (recursive descent)
// ═══════════════════════════════════════════════════════════
class LatexParser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== TokenType.SPACE && t.type !== TokenType.UNKNOWN);
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos] || { type: TokenType.EOF, value: "" }; }
  next() { const t = this.peek(); if (t.type !== TokenType.EOF) this.pos++; return t; }
  matchSymbol(v, includeEscaped = false) {
    const t = this.peek();
    return t.type === TokenType.SYMBOL && t.value === v && (includeEscaped || !t.escaped);
  }
  matchKeyword(v) { const t = this.peek(); return t.type === TokenType.KEYWORD && t.value === v; }

  parseExpression() { return this.parseLineBreak(); }

  parseLineBreak() {
    let node = this.parseRelation();
    while (this.peek().type === TokenType.SYMBOL && this.peek().value === "\\\\") {
      this.next();
      node = { type: "BinaryOp", operator: "#", left: node, right: this.parseRelation() };
    }
    return node;
  }

  canStartFactor() {
    const t = this.peek();
    if (t.type === TokenType.NUMBER) return true;
    if (t.type === TokenType.IDENT) return !RELATION_OPERATORS.has(normalizeLatexOperator(t.value));
    if (t.type === TokenType.TEXT) return true;
    if (t.type === TokenType.KEYWORD) {
      const kw = t.value;
      if (RELATION_OPERATORS.has(normalizeLatexOperator(kw))) return false;
      return !["times","right","end","over","atop","choose","overset","underset"].includes(kw);
    }
    if (t.type === TokenType.SYMBOL) {
      if (t.escaped) return true;
      if (isOpenDelimiter(t.value)) return true;
      return !["+", "-", "/", "^", "_", "=", "<", ">", "&", "#", "\\\\"].includes(t.value) && !isCloseDelimiter(t.value);
    }
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
      const normalized = normalizeLatexOperator(t.value);
      if (RELATION_OPERATORS.has(normalized)) {
        this.next();
        return normalized;
      }
    }
    return null;
  }

  tryParseAnnotatedRelationOperator() {
    if (!this.matchKeyword("overset") && !this.matchKeyword("underset")) return null;
    const start = this.pos;
    const op = this.parseAnnotatedOperator();
    if (op && RELATION_OPERATORS.has(op.arrow)) return op;
    this.pos = start;
    return null;
  }

  parseAnnotatedOperator() {
    if (this.matchKeyword("overset") || this.matchKeyword("underset")) {
      const kind = this.next().value;
      const annotation = this.parseGroupExpression();
      let base = null;
      if (this.matchSymbol("{")) {
        this.next();
        base = this.parseAnnotatedOperator() || this.parseRelationOperatorAtom();
        if (this.matchSymbol("}")) this.next();
      } else {
        base = this.parseAnnotatedOperator() || this.parseRelationOperatorAtom();
      }
      if (!base) return null;
      return {
        arrow: base.arrow,
        above: kind === "overset" ? annotation : base.above,
        below: kind === "underset" ? annotation : base.below
      };
    }
    return this.parseRelationOperatorAtom();
  }

  parseRelationOperatorAtom() {
    const start = this.pos;
    const op = this.tryParseCompoundSymbolOperator();
    if (op) return { arrow: op, above: null, below: null };
    this.pos = start;
    const t = this.peek();
    if (t.type === TokenType.IDENT || t.type === TokenType.KEYWORD) {
      const normalized = normalizeLatexOperator(t.value);
      if (RELATION_OPERATORS.has(normalized)) {
        this.next();
        return { arrow: normalized, above: null, below: null };
      }
    }
    return null;
  }

  parseRelation() {
    let node = this.parseAdditive();
    while (true) {
      const annotated = this.tryParseAnnotatedRelationOperator();
      if (annotated) {
        node = {
          type: "Relation",
          left: node,
          arrow: annotated.arrow,
          above: annotated.above,
          below: annotated.below,
          right: this.parseAdditive()
        };
        continue;
      }
      const op = this.tryParseInfixRelationOperator();
      if (!op) break;
      const right = this.parseAdditive();
      node = { type: "BinaryOp", operator: op, left: node, right };
    }
    return node;
  }

  parseAdditive() {
    let node = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && (t.value === "+" || t.value === "-")) {
        const next = this.tokens[this.pos + 1];
        if (t.value === "-" && next && next.type === TokenType.SYMBOL && next.value === ">") break;
        this.next();
        node = { type: "BinaryOp", operator: t.value, left: node, right: this.parseTerm() };
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
        if (t.value === "times") {
          this.next();
          node = { type: "BinaryOp", operator: "times", left: node, right: this.parseFactor() };
          continue;
        }
        if (t.value === "over" || t.value === "atop") {
          this.next();
          node = { type: "Fraction", numerator: node, denominator: this.parseFactor(), withBar: t.value === "over" };
          continue;
        }
        if (t.value === "choose") {
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
    if (t.type === TokenType.TEXT) {
      this.next();
      return this.maybeParseSubSup({ type: "Text", value: t.value });
    }
    if (t.type === TokenType.KEYWORD) {
      this.next();
      const kw = t.value;
      if (kw === "left") return this.parseLeftRightBracket();
      if (kw === "begin") return this.parseBeginEnv();
      if (kw === "sqrt") {
        let index = null;
        if (this.matchSymbol("[")) {
          this.next();
          index = this.parseExpression();
          if (this.peek().type === TokenType.SYMBOL && this.peek().value === "]") this.next();
        }
        let rad = this.parseFactor();
        if (rad.type === "Bracket") rad = this.removeBracket(rad);
        return index ? { type: "Root", radicand: rad, index } : { type: "Root", radicand: rad };
      }
      if (kw === "frac") {
        return { type: "Fraction", numerator: this.parseGroupExpression(), denominator: this.parseGroupExpression(), withBar: true };
      }
      if (kw === "int" || kw === "oint") {
        const node = { type: "Integral", variant: kw === "int" ? "int" : "oint" };
        if (this.matchSymbol("_")) { this.next(); node.lower = this.parseSubOrSupContent(); }
        if (this.matchSymbol("^")) { this.next(); node.upper = this.parseSubOrSupContent(); }
        if (this.canStartFactor()) {
          node.body = this.parseFactor();
          if (node.body.type === "Bracket") node.body = this.removeBracket(node.body);
        }
        return node;
      }
      if (kw === "sum") {
        const node = { type: "Summation" };
        if (this.matchSymbol("_")) { this.next(); node.lower = this.parseSubOrSupContent(); }
        if (this.matchSymbol("^")) { this.next(); node.upper = this.parseSubOrSupContent(); }
        if (this.canStartFactor()) {
          node.body = this.parseFactor();
          if (node.body && node.body.type === "Bracket") node.body = this.removeBracket(node.body);
        }
        return node;
      }
      if (kw === "binom") return this.parseChoosePrefix();
      if (kw === "not") return { type: "Negation", child: this.parseFactor() };
      if (["bigg","biggl","biggr","biggm"].includes(kw)) return { type: "SizedLiteral", size: "bigg", child: this.parseSizedTarget() };
      if (["mathrm","mathit","mathbf","boldsymbol"].includes(kw)) return this.parseStyledCommand(kw);
      if (kw === "operatorname") return this.parseOperatorName();
      if (["acute","grave","dot","ddot","bar","vec","hat","tilde","check","widehat","widetilde","overparen","underline","overline","overrightarrow","overleftrightarrow"].includes(kw)) {
        let child = this.parseFactor();
        if (child.type === "Bracket") child = this.removeBracket(child);
        return { type: "Decorated", decoType: LATEX_DECORATION_TO_HWP[kw] || kw, child };
      }
      if (kw === "text" || kw === "mathrm") return this.parseTextCommand();
      return this.maybeParseSubSup({ type: "Literal", value: kw });
    }
    if (t.type === TokenType.SYMBOL) {
      if (t.value === "\"") return this.parseQuotedText();
      if (t.escaped && isOpenDelimiter(t.value)) return this.parseEscapedBracket();
      if (isOpenDelimiter(t.value) && !t.escaped) {
        const open = this.next().value;
        const content = this.parseExpression();
        let right = "";
        if (matchingDelimiter(open) === this.peek().value) right = this.next().value;
        return this.maybeParseSubSup(this.flattenBracket({ type: "Bracket", leftDelim: open, rightDelim: right, content }));
      }
      if (isCloseDelimiter(t.value)) { this.next(); return { type: "Literal", value: t.value }; }
      if (t.value === "\\\\") { this.next(); return { type: "Literal", value: "\\\\" }; }
      this.next();
      return { type: "Literal", value: t.value };
    }
    this.next();
    return { type: "Literal", value: "" };
  }

  parseChoosePrefix() {
    return { type: "Choose", total: this.parseGroupExpression(), choose: this.parseGroupExpression() };
  }

  parseStyledCommand(command) {
    let child = this.matchSymbol("{") ? this.parseGroupExpression() : this.parseFactor();
    if (child && child.type === "Bracket" && child.leftDelim === "{") child = this.removeBracket(child);
    return this.maybeParseSubSup({ type: "Styled", style: LATEX_STYLE_TO_HWP[command] || command, child });
  }

  parseOperatorName() {
    const child = this.parseGroupExpression();
    if (child.type === "Literal" || child.type === "Text" || child.type === "FunctionName") {
      return this.maybeParseSubSup({ type: "FunctionName", value: child.value });
    }
    return this.maybeParseSubSup({ type: "FunctionName", value: toHwpEqn(child).replace(/^"|"$/g, "") });
  }

  parseSizedTarget() {
    const t = this.peek();
    if (t.type === TokenType.SYMBOL || t.type === TokenType.IDENT || t.type === TokenType.KEYWORD || t.type === TokenType.NUMBER) {
      this.next();
      return { type: "Literal", value: t.value };
    }
    return { type: "Literal", value: "" };
  }

  parseTextCommand() {
    if (this.matchSymbol("{")) {
      this.next();
      if (this.peek().type === TokenType.TEXT) {
        const value = this.next().value;
        if (this.matchSymbol("}")) this.next();
        return this.maybeParseSubSup({ type: "Text", value });
      }
      const valueNode = this.parseExpression();
      if (this.matchSymbol("}")) this.next();
      if (valueNode.type === "Literal" && /^[A-Za-z0-9]+$/.test(valueNode.value)) {
        return this.maybeParseSubSup({
          type: "Styled",
          style: "rm",
          child: {
            type: "Bracket",
            leftDelim: "{",
            rightDelim: "}",
            content: { type: "Literal", value: valueNode.value }
          }
        });
      }
      return this.maybeParseSubSup({
        type: "Text",
        value: valueNode.type === "Literal" ? valueNode.value : toLatex(valueNode).replace(/^\\text\{|\}$/g, "")
      });
    }

    const valueNode = this.parseGroupExpression();
    if (valueNode.type === "Literal" && /^[A-Za-z0-9]+$/.test(valueNode.value)) {
      return this.maybeParseSubSup({
        type: "Styled",
        style: "rm",
        child: {
          type: "Bracket",
          leftDelim: "{",
          rightDelim: "}",
          content: { type: "Literal", value: valueNode.value }
        }
      });
    }
    return this.maybeParseSubSup({
      type: "Text",
      value: valueNode.type === "Literal" ? valueNode.value : toLatex(valueNode).replace(/^\\text\{|\}$/g, "")
    });
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
    if (t2 && t2.type === TokenType.KEYWORD && t2.value === "left") {
      this.next();
      return this.maybeParseSubSup({ type: "BinaryOp", operator: "apply", left: makeNameNode(t1.value), right: this.parseLeftRightBracket() });
    }
    if (t2 && t2.type === TokenType.SYMBOL && isOpenDelimiter(t2.value)) {
      this.next();
      return this.maybeParseSubSup({ type: "BinaryOp", operator: "apply", left: makeNameNode(t1.value), right: this.parseFactor() });
    }
    return undefined;
  }

  parseLeftRightBracket() {
    let leftDelim = "";
    const s = this.peek();
    if (s.type === TokenType.SYMBOL && isOpenDelimiter(s.value)) {
      leftDelim = "\\left" + (s.escaped && "{}".includes(s.value) ? `\\${s.value}` : s.value);
      this.next();
    }
    const content = this.parseExpression();
    let rightDelim = "";
    if (this.matchKeyword("right")) {
      this.next();
      const s2 = this.peek();
      if (s2.type === TokenType.SYMBOL && isCloseDelimiter(s2.value)) {
        rightDelim = "\\right" + (s2.escaped && "{}".includes(s2.value) ? `\\${s2.value}` : s2.value);
        this.next();
      }
    }
    if (leftDelim === "" && rightDelim === "") return content;
    return this.maybeParseSubSup(this.flattenBracket({ type: "Bracket", leftDelim, rightDelim, content }));
  }

  parseEscapedBracket() {
    const openToken = this.next();
    const open = openToken.value;
    const close = matchingDelimiter(open);
    let depth = 1;
    let end = this.pos;

    while (end < this.tokens.length) {
      const tk = this.tokens[end];
      if (tk.type === TokenType.EOF) break;
      if (tk.type === TokenType.SYMBOL) {
        if (tk.value === open) depth++;
        else if (tk.value === close) depth--;
        if (depth === 0) break;
      }
      end++;
    }

    const content = parseTokenSlice(LatexParser, this.tokens.slice(this.pos, end));
    this.pos = end;
    if (this.peek().type === TokenType.SYMBOL && this.peek().value === close) this.next();

    return this.maybeParseSubSup({
      type: "Bracket",
      leftDelim: `\\left\\${open}`,
      rightDelim: `\\right\\${close}`,
      content
    });
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

  parseGroupExpression() {
    if (!this.matchSymbol("{")) return this.parseFactor();
    this.next();
    const expr = this.parseExpression();
    if (this.matchSymbol("}")) this.next();
    return expr;
  }

  parseBeginEnv() {
    if (!this.matchSymbol("{")) return { type: "Literal", value: "begin" };
    this.next();
    const envTok = this.peek();
    let envName = "";
    if (envTok.type === TokenType.IDENT || envTok.type === TokenType.KEYWORD) {
      envName = envTok.value.toLowerCase();
      this.next();
    }
    if (this.matchSymbol("}")) this.next();

    let alignSpec = null;
    if (envName === "array" && this.matchSymbol("{")) {
      this.next();
      let raw = "";
      while (!this.matchSymbol("}") && this.peek().type !== TokenType.EOF) raw += this.next().value;
      if (this.matchSymbol("}")) this.next();
      alignSpec = raw;
    }

    const { rows, consumed } = splitLatexRows(this.tokens.slice(this.pos), envName);
    this.pos += consumed;
    this.parseEndEnv(envName);
    return this.maybeParseSubSup({ type: "BeginEnv", envName, rows, alignSpec });
  }

  parseEndEnv(envName) {
    if (!this.matchKeyword("end")) return;
    this.next();
    if (!this.matchSymbol("{")) return;
    this.next();
    const n = this.peek();
    if ((n.type === TokenType.IDENT || n.type === TokenType.KEYWORD) && n.value.toLowerCase() === envName) this.next();
    if (this.matchSymbol("}")) this.next();
  }

  parseSubOrSupContent() {
    if (this.matchSymbol("{")) {
      this.next();
      const expr = this.parseExpression();
      if (this.matchSymbol("}")) this.next();
      return expr;
    }
    const t = this.peek();
    if (t.type !== TokenType.EOF) {
      this.next();
      return { type: "Literal", value: t.value };
    }
    return { type: "Literal", value: "" };
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
}
