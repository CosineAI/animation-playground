const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const controlsRoot = document.getElementById("controls");
const TAU = Math.PI * 2;

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;

const waves = [
  {
    name: "Wave 1",
    color: "#ee68f5",
    amplitude: 72,
    wavelength: 380,
    speed: 0.22,
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

function sampleWaveY(wave, x, time) {
  const phase = ((x + wave.xOffset) / wave.wavelength) * TAU + time * wave.speed;
  return viewHeight * 0.5 + wave.yOffset + Math.sin(phase) * wave.amplitude;
}

function resetParticle(particle, wave, time, rightSide = true) {
  particle.x = rightSide ? viewWidth + Math.random() * 100 : Math.random() * viewWidth;
  const targetY = sampleWaveY(wave, particle.x, time);
  particle.y = targetY + (Math.random() - 0.5) * 28;
  particle.vx = -(0.16 + Math.random() * 0.24);
  particle.vy = (Math.random() - 0.5) * 0.3;
  particle.size = 0.8 + Math.random() * 2.1;
  particle.alpha = 0.2 + Math.random() * 0.65;
}

function syncParticleCount(wave, time) {
  const target = Math.max(0, Math.round(wave.particleCount));
  while (wave.particles.length < target) {
    const particle = {};
    resetParticle(particle, wave, time, false);
    wave.particles.push(particle);
  }
  if (wave.particles.length > target) {
    wave.particles.length = target;
  }
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
          syncParticleCount(wave, performance.now() * 0.001);
        }
      });

      controlWrap.appendChild(label);
      controlWrap.appendChild(input);
      panel.appendChild(controlWrap);
    });

    controlsRoot.appendChild(panel);
  });
}

function drawWave(wave, time) {
  ctx.beginPath();

  for (let x = 0; x <= viewWidth; x += 3) {
    const y = sampleWaveY(wave, x, time);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = wave.color;
  ctx.globalAlpha = 0.92;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function updateAndDrawParticles(wave, time) {
  const rgb = wave.rgb;
  const attractStrength = 0.022;
  const desiredVx = -(0.24 + wave.speed * 0.85);

  for (let i = 0; i < wave.particles.length; i += 1) {
    const particle = wave.particles[i];
    const targetY = sampleWaveY(wave, particle.x, time);

    particle.vy += (targetY - particle.y) * attractStrength;
    particle.vy *= 0.9;
    particle.vx += (desiredVx - particle.vx) * 0.05;

    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < -30) {
      resetParticle(particle, wave, time, true);
    } else if (particle.y < -120 || particle.y > viewHeight + 120) {
      particle.y = targetY + (Math.random() - 0.5) * 18;
      particle.vy *= 0.4;
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.alpha})`;
    ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
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
  const time = timestamp * 0.001;

  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = "#070b18";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  for (let i = 0; i < waves.length; i += 1) {
    drawWave(waves[i], time);
  }

  for (let i = 0; i < waves.length; i += 1) {
    updateAndDrawParticles(waves[i], time);
  }

  requestAnimationFrame(render);
}

for (let i = 0; i < waves.length; i += 1) {
  waves[i].rgb = hexToRgb(waves[i].color);
}

createControls();
resizeCanvas();

for (let i = 0; i < waves.length; i += 1) {
  syncParticleCount(waves[i], performance.now() * 0.001);
}

window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(render);