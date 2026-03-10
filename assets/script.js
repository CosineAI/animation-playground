const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const controlsRoot = document.getElementById("controls");
const controlsToggleButton = document.getElementById("controls-toggle");
const TAU = Math.PI * 2;

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let lastTimestamp = performance.now();
let controlsVisible = true;

const waves = [
  {
    name: "Wave 1",
    color: "#ee68f5",
    amplitude: 72,
    wavelength: 380,
    speed: 0.22,
    glow: 18,
    particleCount: 90,
    xOffset: 0,
    yOffset: -55,
    particles: []
  },
  {
    name: "Wave 2",
    color: "#ccc2ff",
    amplitude: 58,
    wavelength: 300,
    speed: 0.16,
    glow: 15,
    particleCount: 75,
    xOffset: 36,
    yOffset: -16,
    particles: []
  },
  {
    name: "Wave 3",
    color: "#c0deff",
    amplitude: 45,
    wavelength: 450,
    speed: 0.1,
    glow: 13,
    particleCount: 65,
    xOffset: -48,
    yOffset: 22,
    particles: []
  },
  {
    name: "Wave 4",
    color: "#fff0d0",
    amplitude: 35,
    wavelength: 260,
    speed: 0.06,
    glow: 10,
    particleCount: 55,
    xOffset: 72,
    yOffset: 58,
    particles: []
  }
];

const controlSpecs = [
  { key: "amplitude", label: "Amplitude", min: 10, max: 220, step: 1, integer: true },
  { key: "wavelength", label: "Wavelength", min: 80, max: 900, step: 1, integer: true },
  { key: "speed", label: "Movement Speed", min: 0.02, max: 1.2, step: 0.01, integer: false },
  { key: "glow", label: "Glow", min: 0, max: 60, step: 1, integer: true },
  { key: "particleCount", label: "Particles", min: 0, max: 300, step: 1, integer: true },
  { key: "yOffset", label: "Y Translation", min: -350, max: 350, step: 1, integer: true },
  { key: "xOffset", label: "X Translation", min: -700, max: 700, step: 1, integer: true }
];

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function formatValue(key, value) {
  if (key === "speed") {
    return Number(value).toFixed(2);
  }
  return String(Math.round(value));
}

function sampleWavePhase(wave, x, time) {
  return ((x + wave.xOffset) / wave.wavelength) * TAU + time * wave.speed;
}

function sampleWaveY(wave, x, time) {
  const phase = sampleWavePhase(wave, x, time);
  return viewHeight * 0.5 + wave.yOffset + Math.sin(phase) * wave.amplitude;
}

function sampleWaveSlope(wave, x, time) {
  const phase = sampleWavePhase(wave, x, time);
  return Math.cos(phase) * wave.amplitude * (TAU / wave.wavelength);
}

function resetParticle(particle, wave, rightSide = true) {
  particle.anchorX = rightSide ? viewWidth + Math.random() * 140 : Math.random() * viewWidth;
  particle.orbitAngle = Math.random() * TAU;
  particle.orbitSpeed = 0.9 + Math.random() * 1.8;
  particle.orbitRadius = 4 + Math.random() * 18;
  particle.driftScale = 0.7 + Math.random() * 0.8;
  particle.size = 0.8 + Math.random() * 2;
  particle.alpha = 0.26 + Math.random() * 0.52;
}

function syncParticleCount(wave) {
  const target = Math.max(0, Math.round(wave.particleCount));
  while (wave.particles.length < target) {
    const particle = {};
    resetParticle(particle, wave, false);
    wave.particles.push(particle);
  }
  if (wave.particles.length > target) {
    wave.particles.length = target;
  }
}

function setControlsVisibility(visible) {
  controlsVisible = visible;
  document.body.classList.toggle("controls-hidden", !visible);
  controlsToggleButton.textContent = visible ? "Hide Controls" : "Show Controls";
  controlsToggleButton.setAttribute("aria-expanded", String(visible));
}

function createControls() {
  controlsRoot.innerHTML = "";

  waves.forEach((wave, waveIndex) => {
    const panel = document.createElement("section");
    panel.className = "wave-panel";

    const title = document.createElement("h2");
    title.className = "wave-title";
    title.textContent = wave.name;
    title.style.color = wave.color;
    panel.appendChild(title);

    controlSpecs.forEach((spec) => {
      const controlWrap = document.createElement("div");
      controlWrap.className = "control-group";

      const label = document.createElement("label");
      label.htmlFor = `wave-${waveIndex}-${spec.key}`;
      label.innerHTML = `<span>${spec.label}</span><span>${formatValue(spec.key, wave[spec.key])}</span>`;

      const input = document.createElement("input");
      input.type = "range";
      input.id = `wave-${waveIndex}-${spec.key}`;
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.value = String(wave[spec.key]);
      input.style.accentColor = wave.color;

      input.addEventListener("input", () => {
        const nextValue = spec.integer ? Number.parseInt(input.value, 10) : Number.parseFloat(input.value);
        wave[spec.key] = nextValue;
        label.lastElementChild.textContent = formatValue(spec.key, nextValue);
        if (spec.key === "particleCount") {
          syncParticleCount(wave);
        }
      });

      controlWrap.appendChild(label);
      controlWrap.appendChild(input);
      panel.appendChild(controlWrap);
    });

    controlsRoot.appendChild(panel);
  });
}

function traceWavePath(wave, time) {
  ctx.beginPath();
  for (let x = 0; x <= viewWidth; x += 3) {
    const y = sampleWaveY(wave, x, time);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
}

function drawWave(wave, time) {
  traceWavePath(wave, time);
  ctx.lineWidth = 6;
  ctx.strokeStyle = wave.color;
  ctx.globalAlpha = 0.28;
  ctx.shadowColor = wave.color;
  ctx.shadowBlur = wave.glow;
  ctx.stroke();

  traceWavePath(wave, time);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = wave.color;
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = Math.max(0, wave.glow * 0.4);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

function updateAndDrawParticles(wave, time, deltaSeconds) {
  const rgb = wave.rgb;
  const baseFlow = 36 + wave.speed * 120;

  for (let i = 0; i < wave.particles.length; i += 1) {
    const particle = wave.particles[i];
    particle.anchorX -= baseFlow * particle.driftScale * deltaSeconds;
    particle.orbitAngle += particle.orbitSpeed * deltaSeconds;

    const baseY = sampleWaveY(wave, particle.anchorX, time);
    const slope = sampleWaveSlope(wave, particle.anchorX, time);
    const tangentLength = Math.hypot(1, slope);
    const tangentX = 1 / tangentLength;
    const tangentY = slope / tangentLength;
    const normalX = -tangentY;
    const normalY = tangentX;

    const sinOrbit = Math.sin(particle.orbitAngle);
    const cosOrbit = Math.cos(particle.orbitAngle);
    const radius = particle.orbitRadius;
    const tangentStretch = radius * 0.45;

    const px = particle.anchorX + normalX * sinOrbit * radius + tangentX * cosOrbit * tangentStretch;
    const py = baseY + normalY * sinOrbit * radius + tangentY * cosOrbit * tangentStretch;

    if (particle.anchorX < -190) {
      resetParticle(particle, wave, true);
      continue;
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.alpha})`;
    ctx.arc(px, py, particle.size, 0, TAU);
    ctx.fill();
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;

  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render(timestamp) {
  const deltaSeconds = Math.min(0.05, (timestamp - lastTimestamp) * 0.001 || 0.016);
  lastTimestamp = timestamp;
  const time = timestamp * 0.001;

  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  for (let i = 0; i < waves.length; i += 1) {
    drawWave(waves[i], time);
  }

  for (let i = 0; i < waves.length; i += 1) {
    updateAndDrawParticles(waves[i], time, deltaSeconds);
  }

  requestAnimationFrame(render);
}

for (let i = 0; i < waves.length; i += 1) {
  waves[i].rgb = hexToRgb(waves[i].color);
}

createControls();
resizeCanvas();

for (let i = 0; i < waves.length; i += 1) {
  syncParticleCount(waves[i]);
}

controlsToggleButton.addEventListener("click", () => {
  setControlsVisibility(!controlsVisible);
});

setControlsVisibility(true);

window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(render);