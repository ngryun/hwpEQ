// ═══════════════════════════════════════════════════════════
// Parser Utility Functions (shared by both parsers)
// ═══════════════════════════════════════════════════════════
function parseTokenSlice(ParserClass, tokens) {
  const filtered = tokens.filter(t => t.type !== TokenType.EOF);
  if (filtered.length === 0) return { type: "Literal", value: "" };
  return new ParserClass([...filtered, { type: TokenType.EOF, value: "" }]).parseExpression();
}

function transposeHwpMatrixColumns(columns) {
  const rowCount = columns.reduce((max, column) => Math.max(max, column.entries.length), 0);
  const rows = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    rows.push(columns.map(column => column.entries[rowIndex] || { type: "Literal", value: "" }));
  }
  return {
    rows,
    columnAlignSpec: columns.map(column => column.align).join("")
  };
}

function splitHwpColumnEntries(tokens) {
  const entries = [];
  let current = [];
  let depth = 0;

  const pushEntry = () => {
    entries.push(parseTokenSlice(HwpParser, current));
    current = [];
  };

  for (const tk of tokens) {
    if (tk.type === TokenType.EOF) break;
    if (tk.type === TokenType.SYMBOL && isOpenDelimiter(tk.value)) {
      depth++;
      current.push(tk);
      continue;
    }
    if (tk.type === TokenType.SYMBOL && isCloseDelimiter(tk.value)) {
      depth = Math.max(0, depth - 1);
      current.push(tk);
      continue;
    }
    if (depth === 0 && tk.type === TokenType.SYMBOL && (tk.value === "#" || tk.value === "\\\\")) {
      pushEntry();
      continue;
    }
    current.push(tk);
  }

  if (current.length > 0 || entries.length === 0) pushEntry();
  return entries;
}

function matrixDelimitersToLatex(envName) {
  if (envName === "pmatrix") return { left: "\\left(", right: "\\right)" };
  if (envName === "bmatrix") return { left: "\\left[", right: "\\right]" };
  if (envName === "dmatrix") return { left: "\\left|", right: "\\right|" };
  return { left: "", right: "" };
}

function bracketDelimitersToHwpMatrixEnv(leftDelim, rightDelim) {
  if ((leftDelim === "\\left(" || leftDelim === "(") && (rightDelim === "\\right)" || rightDelim === ")")) return "pmatrix";
  if ((leftDelim === "\\left[" || leftDelim === "[") && (rightDelim === "\\right]" || rightDelim === "]")) return "bmatrix";
  if ((leftDelim === "\\left|" || leftDelim === "|") && (rightDelim === "\\right|" || rightDelim === "|")) return "dmatrix";
  return "matrix";
}

function renderLatexEnvRows(rows) {
  return rows.map(row => row.map(cell => toLatex(cell)).join(" & ")).join(" \\\\ ");
}

function formatHwpMatrixColumnMode(envName, rows, alignSpec) {
  const columnCount = Math.max(
    alignSpec ? alignSpec.length : 0,
    rows.reduce((max, row) => Math.max(max, row.length), 0)
  );
  const normalizedAlign = (alignSpec || "").padEnd(columnCount, "c");
  const columns = [];

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
    const keyword = alignToHwpColumnKeyword(normalizedAlign[columnIndex] || "c");
    const entries = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      entries.push(toHwpEqn(rows[rowIndex][columnIndex] || { type: "Literal", value: "" }));
    }
    columns.push(`${keyword}{${entries.join(" # ")}}`);
  }

  return `${envName}{${columns.join(" ")}}`;
}

function splitHwpRows(tokens) {
  const rows = [];
  let row = [];
  let cell = [];
  let depth = 1;

  const pushCell = () => {
    row.push(parseTokenSlice(HwpParser, cell));
    cell = [];
  };

  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  while (tokens.length > 0) {
    const tk = tokens.shift();
    if (tk.type === TokenType.EOF) break;
    if (tk.type === TokenType.SYMBOL && isOpenDelimiter(tk.value)) {
      depth++;
      cell.push(tk);
      continue;
    }
    if (tk.type === TokenType.SYMBOL && isCloseDelimiter(tk.value)) {
      depth--;
      if (tk.value === "}" && depth === 0) {
        if (cell.length > 0 || row.length > 0) pushRow();
        break;
      }
      cell.push(tk);
      continue;
    }
    if (depth === 1 && tk.type === TokenType.SYMBOL && tk.value === "#") {
      pushRow();
      continue;
    }
    if (depth === 1 && tk.type === TokenType.SYMBOL && tk.value === "&") {
      pushCell();
      continue;
    }
    if (depth === 1 && tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
      pushRow();
      continue;
    }
    cell.push(tk);
  }

  return rows.length > 0 ? rows : [[{ type: "Literal", value: "" }]];
}

function splitLatexRows(tokens, envName) {
  const rows = [];
  let row = [];
  let cell = [];
  let depth = 0;
  let consumed = 0;

  const pushCell = () => {
    row.push(parseTokenSlice(LatexParser, cell));
    cell = [];
  };

  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  const isEndEnvAt = (idx) => {
    const t0 = tokens[idx];
    const t1 = tokens[idx + 1];
    const t2 = tokens[idx + 2];
    if (!t0 || !t1 || !t2) return false;
    return t0.type === TokenType.KEYWORD && t0.value === "end"
      && t1.type === TokenType.SYMBOL && t1.value === "{"
      && (t2.type === TokenType.IDENT || t2.type === TokenType.KEYWORD)
      && t2.value.toLowerCase() === envName;
  };

  let i = 0;
  while (i < tokens.length) {
    const tk = tokens[i];
    if (tk.type === TokenType.EOF) break;
    if (depth === 0 && isEndEnvAt(i)) {
      if (cell.length > 0 || row.length > 0) pushRow();
      consumed = i;
      break;
    }
    if (tk.type === TokenType.SYMBOL && isOpenDelimiter(tk.value)) {
      depth++;
      cell.push(tk);
      i++;
      continue;
    }
    if (tk.type === TokenType.SYMBOL && isCloseDelimiter(tk.value)) {
      depth = Math.max(0, depth - 1);
      cell.push(tk);
      i++;
      continue;
    }
    if (depth === 0 && tk.type === TokenType.SYMBOL && tk.value === "&") {
      pushCell();
      i++;
      continue;
    }
    if (depth === 0 && tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
      pushRow();
      i++;
      continue;
    }
    cell.push(tk);
    i++;
  }

  if (consumed === 0 && i >= tokens.length) consumed = i;
  return {
    rows: rows.length > 0 ? rows : [[{ type: "Literal", value: "" }]],
    consumed
  };
}
