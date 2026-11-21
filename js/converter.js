// ═══════════════════════════════════════════════════════════
// AST Conversion Functions (toLatex / toHwpEqn)
// ═══════════════════════════════════════════════════════════
function envNameToLatex(node) {
  if (node.envName === "dmatrix") return { envName: "vmatrix" };
  if (node.envName === "pile") return { envName: "array", alignSpec: "c" };
  if (node.envName === "lpile") return { envName: "array", alignSpec: "l" };
  if (node.envName === "rpile") return { envName: "array", alignSpec: "r" };
  if (node.envName === "eqalign") return { envName: "aligned" };
  return { envName: node.envName, alignSpec: node.alignSpec || node.columnAlignSpec || null };
}

function escapeLatexDelimiter(delim) {
  if (delim === "{") return "\\{";
  if (delim === "}") return "\\}";
  return delim;
}

function normalizeHwpDelimiter(delim) {
  return lookupOwn(LATEX_DELIMITER_TO_HWP, delim) || delim;
}

// A script on UNION/INTER makes it the big operator.
function scriptBaseToLatex(base) {
  const limitForm = base.type === "Literal" ? lookupCaseless(HWP_LIMIT_FORM_TO_LATEX, base.value) : undefined;
  return limitForm || toLatex(base);
}

// Short division: every row but the last is "divisor | numbers"; the last row holds the results,
// which sit under the number columns.
function ladderToLatex(node) {
  const width = Math.max(2, ...node.rows.map(row => row.length));
  const lines = node.rows.map((row, index) => {
    const cells = row.map(cell => toLatex(cell));
    if (index > 0 && index === node.rows.length - 1) {
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      cells.unshift("");
    }
    while (cells.length < width) cells.push("");
    return cells.join(" & ");
  });
  return `\\begin{array}{r|${"r".repeat(width - 1)}} ${lines.join(" \\\\ \\hline ")} \\end{array}`;
}

// Long division: quotient on top, then the dividend under a bar, then pairs of
// "subtracted value / remainder" with a rule under each subtracted value.
function longDivisionToLatex(node) {
  const [dividend, ...steps] = node.rows.map(row => row.map(cell => toLatex(cell)).join(" "));
  let out = `\\begin{array}{r} ${toLatex(node.quotient)} \\\\ ${toLatex(node.divisor)} \\overline{\\smash{)}\\,${dividend}}`;
  steps.forEach((step, index) => {
    out += ` \\\\ ${index % 2 === 1 ? "\\hline " : ""}${step}`;
  });
  return `${out} \\end{array}`;
}

function hwpRowsToString(rows) {
  return rows.map(row => row.map(cell => toHwpEqn(cell)).join(" & ")).join(" # ");
}

function formatHwpLeftRight(leftDelim, content, rightDelim) {
  return `LEFT ${normalizeHwpDelimiter(leftDelim || ".")} ${content} RIGHT ${normalizeHwpDelimiter(rightDelim || ".")}`;
}

function envNameToHwp(node) {
  if (node.envName === "vmatrix") return { envName: "dmatrix" };
  if (node.envName === "aligned") return { envName: "eqalign" };
  if (node.envName === "array") {
    const cleanAlign = sanitizeArrayAlignSpec(node.alignSpec);
    if (cleanAlign === "l") return { envName: "lpile" };
    if (cleanAlign === "r") return { envName: "rpile" };
    if (cleanAlign === "c") return { envName: "pile" };
    if (cleanAlign && cleanAlign.length > 1) return { envName: "matrix", columnAlignSpec: cleanAlign };
    return { envName: "eqalign" };
  }
  return { envName: node.envName, alignSpec: node.alignSpec || null, columnAlignSpec: node.columnAlignSpec || null };
}

function toLatex(node) {
  switch (node.type) {
    case "Literal":
      return literalToLatex(node.value);
    case "FunctionName":
      return functionNameToLatex(node.value);
    case "Text":
      return `\\text{${node.value}}`;
    case "Styled":
      if (isEmptyNode(node.child)) return "";
      return `${STYLE_TO_LATEX[node.style] || "\\mathrm"}{${toLatex(node.child)}}`;
    case "UnaryOp": {
      const operator = operatorToLatex(node.operator);
      return /^\\[A-Za-z]+$/.test(operator) ? `${operator} ${toLatex(node.child)}` : `${operator}${toLatex(node.child)}`;
    }
    case "Negation":
      return joinLatex("\\not", toLatex(node.child));
    case "SizedLiteral":
      return joinLatex(`\\${node.size}`, toLatex(node.child));
    case "Choose":
      return `\\binom{${toLatex(node.total)}}{${toLatex(node.choose)}}`;
    case "Relation": {
      let decorated = operatorToLatex(node.arrow);
      if (!isEmptyNode(node.below)) decorated = `\\underset{${toLatex(node.below)}}{${decorated}}`;
      if (!isEmptyNode(node.above)) decorated = `\\overset{${toLatex(node.above)}}{${decorated}}`;
      return `${toLatex(node.left)} ${decorated} ${toLatex(node.right)}`;
    }
    case "BinaryOp": {
      const left = toLatex(node.left);
      const right = toLatex(node.right);
      if (node.operator === "apply") return `${left}${right}`;
      if (node.operator === "") return formatImplicitSequence(node, toLatex, "latex");
      if (node.operator === "times") return `${left} \\times ${right}`;
      return `${left} ${operatorToLatex(node.operator)} ${right}`;
    }
    case "Fraction":
      return node.withBar
        ? `\\frac{${toLatex(node.numerator)}}{${toLatex(node.denominator)}}`
        : `{${toLatex(node.numerator)} \\atop ${toLatex(node.denominator)}}`;
    case "Root":
      if (node.index) return `\\sqrt[${toLatex(node.index)}]{${toLatex(node.radicand)}}`;
      return `\\sqrt{${toLatex(node.radicand)}}`;
    case "Superscript":
      return `${scriptBaseToLatex(node.base)}^{${toLatex(node.exponent)}}`;
    case "Subscript":
      return `${scriptBaseToLatex(node.base)}_{${toLatex(node.sub)}}`;
    case "Prescript": {
      let scripts = "";
      if (node.sub) scripts += `_{${toLatex(node.sub)}}`;
      if (node.sup) scripts += `^{${toLatex(node.sup)}}`;
      return `{}${scripts}${toLatex(node.base)}`;
    }
    case "Integral": {
      let out = `\\${node.variant}`;
      if (node.lower) out += `_{${toLatex(node.lower)}}`;
      if (node.upper) out += `^{${toLatex(node.upper)}}`;
      if (node.body) out += ` ${toLatex(node.body)}`;
      return out;
    }
    case "Summation": {
      let out = "\\sum";
      if (node.lower) out += `_{${toLatex(node.lower)}}`;
      if (node.upper) out += `^{${toLatex(node.upper)}}`;
      if (node.body) out += ` ${toLatex(node.body)}`;
      return out;
    }
    case "Decorated":
      return `${decorationToLatex(node.decoType, node.child)}{${toLatex(node.child)}}`;
    case "Brace": {
      const out = `${node.over ? "\\overbrace" : "\\underbrace"}{${toLatex(node.child)}}`;
      return isEmptyNode(node.note) ? out : `${out}${node.over ? "^" : "_"}{${toLatex(node.note)}}`;
    }
    case "Scaled": {
      const size = scaleToLatexSize(node.percent);
      return size && !isEmptyNode(node.child) ? `{${size} ${toLatex(node.child)}}` : toLatex(node.child);
    }
    case "Colored":
      return `\\textcolor{${rgbToLatexColor(node.rgb)}}{${toLatex(node.child)}}`;
    case "Ladder":
      return ladderToLatex(node);
    case "LongDivision":
      return longDivisionToLatex(node);
    case "BeginEnv": {
      const mapped = envNameToLatex(node);
      const rowStr = renderLatexEnvRows(node.rows);
      const matrixAlign = sanitizeArrayAlignSpec(node.columnAlignSpec || mapped.alignSpec);
      if (isHwpMatrixEnvName(node.envName) && matrixAlign && /[^c]/.test(matrixAlign)) {
        const delimiters = matrixDelimitersToLatex(node.envName);
        const arrayLatex = `\\begin{array}{${matrixAlign}} ${rowStr} \\end{array}`;
        return delimiters.left ? `${delimiters.left} ${arrayLatex} ${delimiters.right}` : arrayLatex;
      }
      if (mapped.envName === "array") return `\\begin{array}{${sanitizeArrayAlignSpec(mapped.alignSpec) || "c"}} ${rowStr} \\end{array}`;
      return `\\begin{${mapped.envName}} ${rowStr} \\end{${mapped.envName}}`;
    }
    case "Bracket": {
      const content = toLatex(node.content);
      if (node.leftDelim.startsWith("LEFT")) {
        const left = `\\left${escapeLatexDelimiter(node.leftDelim.slice(4))}`;
        const right = node.rightDelim.startsWith("RIGHT") ? `\\right${escapeLatexDelimiter(node.rightDelim.slice(5))}` : "\\right.";
        return `${left} ${content} ${right}`;
      }
      if (node.leftDelim.startsWith("\\left")) {
        const left = `\\left${escapeLatexDelimiter(node.leftDelim.slice(5))}`;
        const right = node.rightDelim.startsWith("\\right") ? `\\right${escapeLatexDelimiter(node.rightDelim.slice(6))}` : "\\right.";
        return `${left} ${content} ${right}`;
      }
      return `${node.leftDelim}${content}${node.rightDelim}`;
    }
    default:
      return "";
  }
}

function convertHwpToLatex(input) {
  return toLatex(new HwpParser(tokenizeHwpEqn(input)).parse()).trim();
}

function convertLatexToHwp(input) {
  return toHwpEqn(new LatexParser(tokenizeLatex(input)).parse()).trim();
}

function toHwpEqn(node) {
  switch (node.type) {
    case "Literal":
      return literalToHwp(node.value);
    case "FunctionName":
      return functionNameToHwp(node.value);
    case "Text":
      return `"${node.value}"`;
    case "Styled":
      return formatStyledForHwp(node.style, node.child);
    case "UnaryOp":
      return `${node.operator}${toHwpEqn(node.child)}`;
    case "Negation":
      return `not ${toHwpEqn(node.child)}`;
    case "SizedLiteral":
      return `bigg ${toHwpEqn(node.child)}`;
    case "Choose":
      return `${wrapHwpOperand(node.total)} choose ${wrapHwpOperand(node.choose)}`;
    case "Relation": {
      // \underset alone has no "above" annotation; REL then gets an empty first argument.
      const hasBelow = !isEmptyNode(node.below);
      const keyword = hasBelow ? "REL" : "BUILDREL";
      const above = node.above ? toHwpEqn(node.above) : "";
      let out = `${toHwpEqn(node.left)} ${keyword} ${operatorToHwp(node.arrow)} {${above}}`;
      if (hasBelow) out += ` {${toHwpEqn(node.below)}}`;
      out += ` ${toHwpEqn(node.right)}`;
      return out;
    }
    case "BinaryOp": {
      const left = toHwpEqn(node.left);
      const right = toHwpEqn(node.right);
      if (node.operator === "apply") return `${left}${right}`;
      if (node.operator === "") return formatImplicitSequence(node, toHwpEqn, "hwp");
      if (node.operator === "times") return `${left} times ${right}`;
      return `${left} ${operatorToHwp(node.operator)} ${right}`;
    }
    case "Fraction":
      return node.withBar
        ? `{${toHwpEqn(node.numerator)}} over {${toHwpEqn(node.denominator)}}`
        : `{${toHwpEqn(node.numerator)}} atop {${toHwpEqn(node.denominator)}}`;
    case "Root":
      if (node.index) return `root {${toHwpEqn(node.index)}} of {${toHwpEqn(node.radicand)}}`;
      return `sqrt{${toHwpEqn(node.radicand)}}`;
    case "Superscript":
      return `${toHwpEqn(node.base)}^{${toHwpEqn(node.exponent)}}`;
    case "Subscript":
      return `${toHwpEqn(node.base)}_{${toHwpEqn(node.sub)}}`;
    case "Prescript": {
      let out = toHwpEqn(node.base);
      if (node.sub) out += ` LSUB {${toHwpEqn(node.sub)}}`;
      if (node.sup) out += ` LSUP {${toHwpEqn(node.sup)}}`;
      return out;
    }
    case "Integral": {
      let out = lookupOwn(LATEX_INTEGRAL_TO_HWP, node.variant) || "int";
      if (node.lower) out += `_{${toHwpEqn(node.lower)}}`;
      if (node.upper) out += `^{${toHwpEqn(node.upper)}}`;
      if (node.body) out += ` ${toHwpEqn(node.body)}`;
      return out;
    }
    case "Summation": {
      let out = "sum";
      if (node.lower) out += `_{${toHwpEqn(node.lower)}}`;
      if (node.upper) out += `^{${toHwpEqn(node.upper)}}`;
      if (node.body) out += ` ${toHwpEqn(node.body)}`;
      return out;
    }
    case "Decorated":
      return `${node.decoType}{${toHwpEqn(node.child)}}`;
    case "Brace": {
      const out = `${node.over ? "overbrace" : "underbrace"}{${toHwpEqn(node.child)}}`;
      return isEmptyNode(node.note) ? out : `${out}{${toHwpEqn(node.note)}}`;
    }
    case "Scaled":
      return `scale ${node.percent} ${toHwpEqn(node.child)}`;
    case "Colored":
      return `color{${node.rgb.join(",")}}{${toHwpEqn(node.child)}}`;
    case "Ladder":
      return `${node.kind}{${hwpRowsToString(node.rows)}}`;
    case "LongDivision":
      return `longdiv{${toHwpEqn(node.divisor)}}{${toHwpEqn(node.quotient)}}{${hwpRowsToString(node.rows)}}`;
    case "BeginEnv": {
      const mapped = envNameToHwp(node);
      if (mapped.columnAlignSpec && isHwpMatrixEnvName(mapped.envName)) {
        return formatHwpMatrixColumnMode(mapped.envName, node.rows, mapped.columnAlignSpec);
      }
      return `${mapped.envName}{${hwpRowsToString(node.rows)}}`;
    }
    case "Bracket": {
      if (node.content.type === "BeginEnv" && node.content.envName === "array") {
        const matrixAlign = sanitizeArrayAlignSpec(node.content.alignSpec);
        if (matrixAlign && matrixAlign.length > 1) {
          const envName = bracketDelimitersToHwpMatrixEnv(node.leftDelim, node.rightDelim);
          return formatHwpMatrixColumnMode(envName, node.content.rows, matrixAlign);
        }
      }
      const content = toHwpEqn(node.content);
      if (node.leftDelim.startsWith("\\left")) {
        const right = node.rightDelim.startsWith("\\right") ? node.rightDelim.slice(6) : ".";
        return formatHwpLeftRight(node.leftDelim.slice(5), content, right);
      }
      return `${node.leftDelim}${content}${node.rightDelim}`;
    }
    default:
      return "";
  }
}
