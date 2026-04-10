// ═══════════════════════════════════════════════════════════
// App Logic (UI & Event Handling)
// ═══════════════════════════════════════════════════════════
let mode = 'latex2hwp';

const inputArea = document.getElementById('input-area');
const outputArea = document.getElementById('output-area');
const inputLabel = document.getElementById('input-label');
const outputLabel = document.getElementById('output-label');
const preview = document.getElementById('preview');
const modeBtns = document.querySelectorAll('.mode-btn');
const convertBtn = document.getElementById('convert-btn');
const exampleChips = document.getElementById('example-chips');

const examples = {
  hwp2latex: [
    { label: 'x^2 + y^2', value: 'x^2 + y^2' },
    { label: 'y^2 over z', value: 'y^2 over z' },
    { label: 'a sinx', value: 'a sinx' },
    { label: 'int_1^2 {x^3}', value: 'int_1^2 {x^3}' },
    { label: 'sqrt {a + b}', value: 'sqrt {a + b}' },
    { label: 'sum_1^n {k^2}', value: 'sum_1^n {k^2}' },
    { label: 'pmatrix{1 & 2 # 3 & 4}', value: 'pmatrix{1 & 2 # 3 & 4}' },
    { label: 'bmatrix{lcol{a # c} rcol{b # d}}', value: 'bmatrix{lcol{a # c} rcol{b # d}}' },
  ],
  latex2hwp: [
    { label: 'x^{2} + y^{2}', value: 'x^{2} + y^{2}' },
    { label: '\\frac{y^2}{z}', value: '\\frac{y^2}{z}' },
    { label: 'a \\sin x', value: 'a \\sin x' },
    { label: '\\int_{1}^{2} {x^3}', value: '\\int_{1}^{2} {x^3}' },
    { label: '\\sqrt{a + b}', value: '\\sqrt{a + b}' },
    { label: '\\sum_{1}^{n} {k^2}', value: '\\sum_{1}^{n} {k^2}' },
    { label: '\\begin{cases} x=1 \\\\ y=2 \\end{cases}', value: '\\begin{cases} x=1 \\\\ y=2 \\end{cases}' },
    { label: '\\left[\\begin{array}{lr} a & b \\\\ c & d \\end{array}\\right]', value: '\\left[\\begin{array}{lr} a & b \\\\ c & d \\end{array}\\right]' },
  ]
};

function setMode(m) {
  mode = m;
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  if (m === 'hwp2latex') { inputLabel.textContent = 'HWP Equation'; outputLabel.textContent = 'LaTeX'; inputArea.placeholder = 'x times 3 + y^2 over z'; }
  else { inputLabel.textContent = 'LaTeX'; outputLabel.textContent = 'HWP Equation'; inputArea.placeholder = '\\frac{y^2}{z} + \\int_{1}^{2} {x^3}'; }
  inputArea.value = ''; outputArea.value = ''; preview.innerHTML = '';
  renderExamples();
}

function renderExamples() {
  exampleChips.innerHTML = '';
  for (const ex of examples[mode]) {
    const chip = document.createElement('button');
    chip.className = 'example-chip';
    chip.textContent = ex.label;
    chip.addEventListener('click', () => { inputArea.value = ex.value; convert(); });
    exampleChips.appendChild(chip);
  }
}

function stripDollarSigns(s) {
  return s.replace(/^\$\$?/, '').replace(/\$\$?$/, '').trim();
}

function convert() {
  let input = inputArea.value.trim();
  if (!input) { outputArea.value = ''; preview.innerHTML = ''; return; }
  if (mode === 'latex2hwp') input = stripDollarSigns(input);
  try {
    let tokens, ast, result, latexForPreview;
    if (mode === 'hwp2latex') {
      tokens = tokenizeHwpEqn(input);
      ast = new HwpParser(tokens).parseExpression();
      result = toLatex(ast).trim();
      latexForPreview = result;
    } else {
      tokens = tokenizeLatex(input);
      ast = new LatexParser(tokens).parseExpression();
      result = toHwpEqn(ast).trim();
      latexForPreview = input;
    }
    outputArea.value = result;
    try {
      katex.render(latexForPreview, preview, { throwOnError: false, displayMode: true });
    } catch(e) {
      preview.innerHTML = `<span class="preview-error">Preview not available</span>`;
    }
  } catch(e) {
    outputArea.value = 'Error: ' + e.message;
    preview.innerHTML = `<span class="preview-error">${e.message}</span>`;
  }
}

function handleCopy(btn, textarea) {
  const text = textarea.value.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.querySelector('span').textContent = 'Copied!';
    btn.querySelector('svg').innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.querySelector('span').textContent = 'Copy';
      btn.querySelector('svg').innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>';
    }, 1500);
  });
}

document.getElementById('copy-input').addEventListener('click', function() { handleCopy(this, inputArea); });
document.getElementById('copy-output').addEventListener('click', function() { handleCopy(this, outputArea); });

modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
convertBtn.addEventListener('click', convert);
inputArea.addEventListener('input', convert);
setMode('latex2hwp');
