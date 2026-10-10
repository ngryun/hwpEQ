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
const copyImageBtn = document.getElementById('copy-image');

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
  updateImageCopyButton();
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
  if (!input) { outputArea.value = ''; preview.innerHTML = ''; updateImageCopyButton(); return; }
  if (mode === 'latex2hwp') input = stripDollarSigns(input);
  try {
    let result, latexForPreview;
    if (mode === 'hwp2latex') {
      result = convertHwpToLatex(input);
      latexForPreview = result;
    } else {
      result = convertLatexToHwp(input);
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
  updateImageCopyButton();
}

const CHECK_ICON = '<polyline points="20 6 9 17 4 12"/>';
const CROSS_ICON = '<path d="M18 6L6 18M6 6l12 12"/>';
const flashTimers = new WeakMap();

// Temporarily shows a result label/icon on a button, then restores its original content.
function flashButton(btn, label, { icon = CHECK_ICON, className = 'copied' } = {}) {
  const span = btn.querySelector('span');
  const svg = btn.querySelector('svg');
  if (!flashTimers.has(btn)) {
    btn.dataset.label = span.textContent;
    btn.dataset.icon = svg.innerHTML;
  }
  clearTimeout(flashTimers.get(btn));
  btn.classList.remove('copied', 'failed');
  btn.classList.add(className);
  span.textContent = label;
  svg.innerHTML = icon;
  flashTimers.set(btn, setTimeout(() => {
    btn.classList.remove(className);
    span.textContent = btn.dataset.label;
    svg.innerHTML = btn.dataset.icon;
    flashTimers.delete(btn);
  }, 1500));
}

function handleCopy(btn, textarea) {
  const text = textarea.value.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => flashButton(btn, 'Copied!'),
    () => flashButton(btn, 'Failed', { icon: CROSS_ICON, className: 'failed' })
  );
}

function updateImageCopyButton() {
  copyImageBtn.disabled = !preview.querySelector('.katex');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Copies the preview as a PNG. Falls back to saving the file when the browser
// cannot put images on the clipboard (or the user denies clipboard access).
async function handleCopyImage(btn) {
  const katexElement = preview.querySelector('.katex');
  if (!katexElement) return;
  // ClipboardItem gets the pending PNG so write() is still called within the click (required by Safari).
  const pngPromise = renderEquationToPng(katexElement);
  try {
    if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') {
      throw new Error('Image clipboard not supported');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })]);
    flashButton(btn, 'Copied!');
  } catch (clipboardError) {
    try {
      downloadBlob(await pngPromise, 'equation.png');
      flashButton(btn, 'Saved PNG');
    } catch (renderError) {
      console.error(renderError);
      flashButton(btn, 'Failed', { icon: CROSS_ICON, className: 'failed' });
    }
  }
}

document.getElementById('copy-input').addEventListener('click', function() { handleCopy(this, inputArea); });
document.getElementById('copy-output').addEventListener('click', function() { handleCopy(this, outputArea); });
copyImageBtn.addEventListener('click', function() { handleCopyImage(this); });

modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
convertBtn.addEventListener('click', convert);
inputArea.addEventListener('input', convert);
setMode('latex2hwp');
