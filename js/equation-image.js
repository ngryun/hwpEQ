// ═══════════════════════════════════════════════════════════
// Equation Image Export (KaTeX preview → PNG)
// ═══════════════════════════════════════════════════════════
// The rendered KaTeX markup is placed in an SVG <foreignObject> together with the KaTeX
// stylesheet, then rasterized on a canvas. An SVG image cannot load external files, so the
// fonts the equation uses are inlined as data URLs.
const EQUATION_IMAGE_FONT_PX = 24;
const EQUATION_IMAGE_SCALE = 2;
const EQUATION_IMAGE_FONT_WAIT_MS = 3000;
// Shared by the off-screen measuring frame and the SVG frame so both lay out identically.
// font-size/line-height 0 keep the frame's own text metrics out of the line box.
const EQUATION_IMAGE_FRAME_STYLE = "display:inline-block;padding:12px;font-size:0;line-height:0;color:#000;white-space:nowrap;";

let katexCssTextPromise = null;
const fontDataUrlCache = new Map();

function getKatexStylesheetUrl() {
  const link = document.querySelector('link[rel="stylesheet"][href*="katex"]');
  if (!link) throw new Error("KaTeX stylesheet not found");
  return link.href;
}

function fetchKatexCssText(cssUrl) {
  if (!katexCssTextPromise) {
    katexCssTextPromise = fetch(cssUrl).then(response => {
      if (!response.ok) throw new Error(`Failed to load ${cssUrl}`);
      return response.text();
    });
    katexCssTextPromise.catch(() => { katexCssTextPromise = null; });
  }
  return katexCssTextPromise;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function fetchFontDataUrl(url) {
  if (!fontDataUrlCache.has(url)) {
    const promise = fetch(url).then(response => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.blob();
    }).then(blobToDataUrl);
    promise.catch(() => fontDataUrlCache.delete(url));
    fontDataUrlCache.set(url, promise);
  }
  return fontDataUrlCache.get(url);
}

function collectFontFamilies(root) {
  const families = new Set();
  for (const element of [root, ...root.querySelectorAll("*")]) {
    families.add(getComputedStyle(element).fontFamily.split(",")[0].replace(/["']/g, "").trim());
  }
  return families;
}

// Returns the KaTeX stylesheet with only the used font families kept, each embedded as a data URL.
async function buildSelfContainedKatexCss(usedFamilies) {
  const cssUrl = getKatexStylesheetUrl();
  const css = await fetchKatexCssText(cssUrl);
  const fontFacePattern = /@font-face\s*{[^}]*}/g;
  const faces = await Promise.all((css.match(fontFacePattern) || []).map(async face => {
    const familyMatch = face.match(/font-family:\s*([^;}]+)/);
    const woff2Match = face.match(/url\(([^)]+?\.woff2)["']?\)/);
    if (!familyMatch || !woff2Match) return "";
    if (!usedFamilies.has(familyMatch[1].replace(/["']/g, "").trim())) return "";
    const dataUrl = await fetchFontDataUrl(new URL(woff2Match[1].replace(/["']/g, ""), cssUrl).href);
    return face.replace(/src:[^;}]+/, `src:url(${dataUrl}) format("woff2")`);
  }));
  let faceIndex = 0;
  return css.replace(fontFacePattern, () => faces[faceIndex++]);
}

function escapeXmlText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to render equation image"));
    image.src = src;
  });
}

// Renders a KaTeX element (span.katex) to a PNG blob with a white background.
async function renderEquationToPng(katexElement) {
  const clone = katexElement.cloneNode(true);
  const mathml = clone.querySelector(".katex-mathml");
  if (mathml) mathml.remove();
  clone.style.fontSize = `${EQUATION_IMAGE_FONT_PX}px`;

  const frame = document.createElement("div");
  frame.style.cssText = `position:fixed;left:-100000px;top:0;${EQUATION_IMAGE_FRAME_STYLE}`;
  frame.appendChild(clone);
  document.body.appendChild(frame);
  let width, height, families;
  try {
    // Laying out the clone starts loading any KaTeX fonts not used on the page yet; measuring
    // before they arrive would size the image with fallback-font metrics and clip it.
    frame.getBoundingClientRect();
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, EQUATION_IMAGE_FONT_WAIT_MS))]);
    const rect = frame.getBoundingClientRect();
    width = Math.ceil(rect.width);
    height = Math.ceil(rect.height);
    families = collectFontFamilies(clone);
  } finally {
    frame.remove();
  }

  const css = await buildSelfContainedKatexCss(families);
  const scale = EQUATION_IMAGE_SCALE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">`
    + `<foreignObject width="${width}" height="${height}">`
    + `<div xmlns="http://www.w3.org/1999/xhtml" style="${EQUATION_IMAGE_FRAME_STYLE}">`
    + `<style>${escapeXmlText(`*{box-sizing:border-box}${css}`)}</style>`
    + new XMLSerializer().serializeToString(clone)
    + `</div></foreignObject></svg>`;
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png");
  });
}
