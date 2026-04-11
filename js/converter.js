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
  if (delim === "\\{" || delim === "{") return "{";
  if (delim === "\\}" || delim === "}") return "}";
  return delim;
}

function formatHwpLeftRight(leftDelim, content, rightDelim) {
  const left = `LEFT ${normalizeHwpDelimiter(leftDelim)}`;
  const right = rightDelim ? ` RIGHT ${normalizeHwpDelimiter(rightDelim)}` : "";
  return `${left} ${content}${right}`;
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
      return `${STYLE_TO_LATEX[node.style] || "\\mathrm"}{${toLatex(node.child)}}`;
    case "UnaryOp":
      return `${node.operator}${toLatex(node.child)}`;
    case "Negation":
      return `\\not${toLatex(node.child)}`;
    case "SizedLiteral":
      return `\\${node.size}${toLatex(node.child)}`;
    case "Choose":
      return `\\binom{${toLatex(node.total)}}{${toLatex(node.choose)}}`;
    case "Relation": {
      const arrow = operatorToLatex(node.arrow);
      const decorated = node.below
        ? `\\overset{${toLatex(node.above)}}{\\underset{${toLatex(node.below)}}{${arrow}}}`
        : `\\overset{${toLatex(node.above)}}{${arrow}}`;
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
      return `${toLatex(node.base)}^{${toLatex(node.exponent)}}`;
    case "Subscript":
      return `${toLatex(node.base)}_{${toLatex(node.sub)}}`;
    case "Integral": {
      let out = node.variant === "int" ? "\\int" : "\\oint";
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
      return `${DECORATION_TO_LATEX[node.decoType] || ("\\" + node.decoType)}{${toLatex(node.child)}}`;
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
        const right = node.rightDelim.startsWith("RIGHT") ? `\\right${escapeLatexDelimiter(node.rightDelim.slice(5))}` : "";
        return `${left} ${content} ${right}`;
      }
      if (node.leftDelim.startsWith("\\left")) {
        const left = `\\left${escapeLatexDelimiter(node.leftDelim.slice(5))}`;
        const right = node.rightDelim.startsWith("\\right") ? `\\right${escapeLatexDelimiter(node.rightDelim.slice(6))}` : node.rightDelim;
        return `${left} ${content} ${right}`;
      }
      return `${node.leftDelim}${content}${node.rightDelim}`;
    }
    default:
      return "";
  }
}

function toHwpEqn(node) {
  switch (node.type) {
    case "Literal":
      return literalToHwp(node.value);
    case "FunctionName":
      return node.value;
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
      return `${toHwpEqn(node.total)} choose ${toHwpEqn(node.choose)}`;
    case "Relation": {
      const keyword = node.below ? "REL" : "BUILDREL";
      let out = `${toHwpEqn(node.left)} ${keyword} ${literalToHwp(node.arrow)} {${toHwpEqn(node.above)}}`;
      if (node.below) out += ` {${toHwpEqn(node.below)}}`;
      out += ` ${toHwpEqn(node.right)}`;
      return out;
    }
    case "BinaryOp": {
      const left = toHwpEqn(node.left);
      const right = toHwpEqn(node.right);
      if (node.operator === "apply") return `${left}${right}`;
      if (node.operator === "") return formatImplicitSequence(node, toHwpEqn, "hwp");
      if (node.operator === "times") return `${left} times ${right}`;
      return `${left} ${literalToHwp(node.operator)} ${right}`;
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
    case "Integral": {
      let out = node.variant === "int" ? "int" : "oint";
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
      return `${node.decoType} ${toHwpEqn(node.child)}`;
    case "BeginEnv": {
      const mapped = envNameToHwp(node);
      if (mapped.columnAlignSpec && isHwpMatrixEnvName(mapped.envName)) {
        return formatHwpMatrixColumnMode(mapped.envName, node.rows, mapped.columnAlignSpec);
      }
      const rowStr = node.rows.map(row => row.map(cell => toHwpEqn(cell)).join(" & ")).join(" # ");
      return `${mapped.envName}{${rowStr}}`;
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
        const right = node.rightDelim.startsWith("\\right") ? node.rightDelim.slice(6) : "";
        return formatHwpLeftRight(node.leftDelim.slice(5), content, right);
      }
      return `${node.leftDelim}${content}${node.rightDelim}`;
    }
    default:
      return "";
  }
}
