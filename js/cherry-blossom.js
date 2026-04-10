// ═══════════════════════════════════════════════════════════
// Cherry Blossom Particle System (SVG + mouse wind)
// ═══════════════════════════════════════════════════════════
(function() {
  const svg = document.getElementById('sakura-canvas');
  const NS = 'http://www.w3.org/2000/svg';
  let W = window.innerWidth, H = window.innerHeight;
  let mouseX = W / 2, mouseY = H / 2;
  let mouseVX = 0, mouseVY = 0;
  let prevMouseX = mouseX, prevMouseY = mouseY;

  // Ambient wind — constant gentle breeze blowing diagonally
  let ambientWindX = 0.4, ambientWindY = 0.1;
  // Gust system — occasional stronger wind bursts
  let gustX = 0, gustY = 0, gustTimer = 0, gustDuration = 0;
  // Mouse-driven wind
  let mouseWindX = 0, mouseWindY = 0;

  window.addEventListener('resize', () => { W = window.innerWidth; H = window.innerHeight; });
  window.addEventListener('mousemove', e => {
    prevMouseX = mouseX; prevMouseY = mouseY;
    mouseX = e.clientX; mouseY = e.clientY;
    mouseVX = mouseX - prevMouseX;
    mouseVY = mouseY - prevMouseY;
  });

  // SVG defs for blur layers
  const defs = document.createElementNS(NS, 'defs');
  // Near layer blur (large petals, slightly soft)
  const filterNear = document.createElementNS(NS, 'filter');
  filterNear.setAttribute('id', 'blur-near');
  const feNear = document.createElementNS(NS, 'feGaussianBlur');
  feNear.setAttribute('stdDeviation', '0.8');
  filterNear.appendChild(feNear);
  defs.appendChild(filterNear);
  // Far layer blur (small petals, more blur)
  const filterFar = document.createElementNS(NS, 'filter');
  filterFar.setAttribute('id', 'blur-far');
  const feFar = document.createElementNS(NS, 'feGaussianBlur');
  feFar.setAttribute('stdDeviation', '1.5');
  filterFar.appendChild(feFar);
  defs.appendChild(filterFar);
  svg.appendChild(defs);

  function createPetalShape(depth) {
    const g = document.createElementNS(NS, 'g');
    const petal = document.createElementNS(NS, 'path');
    // Vary size by depth: far=small, near=large
    const baseSize = depth < 0.33 ? (3 + Math.random() * 3) :
                     depth < 0.66 ? (5 + Math.random() * 5) :
                                    (8 + Math.random() * 7);
    const s = baseSize;
    // Organic petal shape
    petal.setAttribute('d', `M0,0 C${s*0.35},${-s*0.55} ${s*1.05},${-s*0.25} ${s*0.55},${s*0.25} C${s*0.25},${s*0.55} ${s*0.08},${s*0.3} 0,0 Z`);

    const hue = 335 + Math.random() * 18;
    const sat = 50 + Math.random() * 35;
    const light = 78 + Math.random() * 14;
    // Opacity varies by depth: far petals are more transparent
    const alpha = depth < 0.33 ? (0.15 + Math.random() * 0.15) :
                  depth < 0.66 ? (0.25 + Math.random() * 0.2) :
                                 (0.35 + Math.random() * 0.25);
    petal.setAttribute('fill', `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`);
    g.appendChild(petal);

    // Subtle vein
    const vein = document.createElementNS(NS, 'line');
    vein.setAttribute('x1', '0'); vein.setAttribute('y1', '0');
    vein.setAttribute('x2', String(s * 0.4)); vein.setAttribute('y2', String(s * 0.06));
    vein.setAttribute('stroke', `hsla(${hue}, 70%, 90%, ${alpha * 0.3})`);
    vein.setAttribute('stroke-width', '0.3');
    g.appendChild(vein);

    // Apply blur based on depth
    if (depth < 0.33) g.setAttribute('filter', 'url(#blur-far)');
    else if (depth > 0.8) g.setAttribute('filter', 'url(#blur-near)');

    return g;
  }

  const PETAL_COUNT = 120;
  const petals = [];

  for (let i = 0; i < PETAL_COUNT; i++) {
    const depth = Math.random(); // 0=far, 1=near
    const el = createPetalShape(depth);
    svg.appendChild(el);

    // Speed scales with depth (parallax)
    const speedMul = 0.3 + depth * 0.7;

    petals.push({
      el, depth, speedMul,
      x: Math.random() * (W + 400) - 200,
      y: Math.random() * (H + 200) - 200,
      vx: 0, vy: 0,
      // Rotation on Z axis (2D rotation)
      rotZ: Math.random() * 360,
      rotZSpeed: (Math.random() - 0.5) * 0.6,
      // Simulated 3D tumble via scaleX oscillation
      flipPhase: Math.random() * Math.PI * 2,
      flipSpeed: 0.3 + Math.random() * 0.8,
      // Spiral / swirl motion
      swirlPhase: Math.random() * Math.PI * 2,
      swirlSpeed: 0.15 + Math.random() * 0.35,
      swirlRadius: 8 + Math.random() * 20,
      // Base fall speed (very gentle)
      baseFallSpeed: (0.1 + Math.random() * 0.2) * speedMul,
      // Base drift speed (horizontal)
      baseDriftSpeed: (0.15 + Math.random() * 0.3) * speedMul,
      scale: depth < 0.33 ? 0.4 + Math.random() * 0.3 :
             depth < 0.66 ? 0.6 + Math.random() * 0.4 :
                            0.8 + Math.random() * 0.5
    });
  }

  let time = 0;
  function animate() {
    time += 0.016;

    // Mouse wind — smooth follow
    mouseWindX += (mouseVX * 0.08 - mouseWindX) * 0.02;
    mouseWindY += (mouseVY * 0.04 - mouseWindY) * 0.02;
    mouseVX *= 0.95; mouseVY *= 0.95;

    // Ambient wind gentle oscillation
    ambientWindX = 0.35 + Math.sin(time * 0.1) * 0.15;
    ambientWindY = 0.05 + Math.sin(time * 0.07 + 1.5) * 0.05;

    // Random gust system
    gustTimer -= 0.016;
    if (gustTimer <= 0) {
      // Trigger a new gust
      gustDuration = 2 + Math.random() * 4;
      gustTimer = gustDuration + 5 + Math.random() * 12; // wait before next gust
      const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // mostly rightward
      const strength = 0.5 + Math.random() * 1.5;
      gustX = Math.cos(angle) * strength;
      gustY = Math.sin(angle) * strength * 0.3;
    }
    // Gust fades in and out
    let gustFade = 0;
    const gustAge = gustDuration - (gustTimer - (5 + 6)); // approximate
    if (gustTimer > 5) {
      // During gust
      const elapsed = gustDuration - (gustTimer - 5 - Math.random() * 7);
      gustFade = Math.sin(Math.min(1, Math.max(0, (gustDuration - (gustTimer - 5)) / gustDuration)) * Math.PI);
    }
    // Simpler: fade gust based on remaining time above threshold
    const inGust = gustTimer > 5;
    if (inGust) {
      const progress = 1 - (gustTimer - 5) / gustDuration;
      gustFade = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
    } else {
      gustFade = 0;
    }

    const totalWindX = ambientWindX + gustX * gustFade + mouseWindX;
    const totalWindY = ambientWindY + gustY * gustFade + mouseWindY;

    for (const p of petals) {
      // Wind influence (depth-based: near petals react more)
      const windInfluence = p.speedMul;

      // Swirl motion — creates spiraling paths
      const swirlX = Math.sin(time * p.swirlSpeed + p.swirlPhase) * p.swirlRadius * 0.008 * windInfluence;
      const swirlY = Math.cos(time * p.swirlSpeed * 0.7 + p.swirlPhase) * p.swirlRadius * 0.004 * windInfluence;

      // Mouse proximity push (gentle)
      const distX = p.x - mouseX;
      const distY = p.y - mouseY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const mouseInfluence = Math.max(0, 1 - dist / 200) * 0.02;
      const pushX = distX * mouseInfluence;
      const pushY = distY * mouseInfluence;

      // Accumulate velocity
      p.vx += (totalWindX * windInfluence * 0.015) + swirlX + pushX;
      p.vy += (p.baseFallSpeed * 0.03) + (totalWindY * windInfluence * 0.01) + swirlY + pushY;

      // Damping
      p.vx *= 0.97;
      p.vy *= 0.98;

      // Clamp
      const maxSpeed = 1.5 * p.speedMul;
      p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
      p.vy = Math.max(-0.5, Math.min(maxSpeed * 0.8, p.vy));

      // Position update
      p.x += p.vx + p.baseDriftSpeed * totalWindX * 0.3;
      p.y += p.vy + p.baseFallSpeed;

      // Z rotation (tumble)
      p.rotZ += p.rotZSpeed + totalWindX * windInfluence * 0.3;

      // 3D flip simulation (scaleX oscillation)
      const flip = Math.cos(time * p.flipSpeed + p.flipPhase);
      const scaleX = p.scale * (0.3 + Math.abs(flip) * 0.7);
      const scaleY = p.scale;

      // Wrap around — generous margins
      if (p.y > H + 60) { p.y = -60 - Math.random() * 100; p.x = Math.random() * (W + 400) - 200; }
      if (p.x > W + 100) { p.x = -80; p.y = Math.random() * H * 0.5; }
      if (p.x < -100) { p.x = W + 80; p.y = Math.random() * H * 0.5; }

      p.el.setAttribute('transform',
        `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${p.rotZ.toFixed(1)}) scale(${scaleX.toFixed(2)},${scaleY.toFixed(2)})`
      );
    }

    requestAnimationFrame(animate);
  }
  animate();
})();
