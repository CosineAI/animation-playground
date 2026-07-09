import { TAU, hslToHex } from "./utils.js";

export function createRainbowProject({ ctx, controlsRoot, getViewWidth, getViewHeight }) {
  const baseHues = [0, 30, 60, 120, 220, 270, 300];
  let hueOffset = 0;
  let particles = [];

  const settings = {
    arcRadius: 320,
    arcThickness: 32,
    particleCount: 120,
    speed: 0.4,
    glow: 24
  };

  const controlSpecs = [
    { key: "arcRadius", label: "Arc span", min: 50, max: 800, step: 1, integer: true },
    { key: "arcThickness", label: "Band thickness", min: 4, max: 120, step: 1, integer: true },
    { key: "particleCount", label: "Sparkle crew", min: 0, max: 400, step: 1, integer: true },
    { key: "speed", label: "Prism shift", min: 0.02, max: 2.0, step: 0.01, integer: false },
    { key: "glow", label: "Sun glow", min: 0, max: 80, step: 1, integer: true }
  ];

  function createParticle() {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const cx = viewWidth / 2;
    const cy = viewHeight + settings.arcRadius * 0.15;
    const radius = settings.arcRadius;

    const angle = Math.PI + Math.random() * Math.PI;
    const dist = radius + (Math.random() - 0.5) * settings.arcThickness;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;

    const driftAngle = angle + (Math.random() - 0.5) * 0.5;
    const driftSpeed = 8 + Math.random() * 24;

    return {
      x,
      y,
      vx: Math.cos(driftAngle) * driftSpeed,
      vy: Math.sin(driftAngle) * driftSpeed,
      life: 1.0,
      decay: 0.2 + Math.random() * 0.8,
      size: 0.8 + Math.random() * 2.2,
      maxLife: 1.0
    };
  }

  function syncParticleCount() {
    const target = Math.max(0, Math.round(settings.particleCount));
    while (particles.length < target) {
      particles.push(createParticle());
    }
    if (particles.length > target) {
      particles.length = target;
    }
  }

  function formatValue(key, value) {
    if (key === "speed") {
      return Number(value).toFixed(2);
    }
    return String(Math.round(value));
  }

  function createControls() {
    controlsRoot.innerHTML = "";

    const panel = document.createElement("section");
    panel.className = "wave-panel";

    const title = document.createElement("h2");
    title.className = "wave-title";
    title.textContent = "Prismatic Horizon";
    title.style.color = "#f0cb78";
    panel.appendChild(title);

    controlSpecs.forEach((spec) => {
      const controlWrap = document.createElement("div");
      controlWrap.className = "control-group";

      const label = document.createElement("label");
      label.htmlFor = `rainbow-${spec.key}`;
      label.innerHTML = `<span>${spec.label}</span><span>${formatValue(spec.key, settings[spec.key])}</span>`;

      const input = document.createElement("input");
      input.type = "range";
      input.id = `rainbow-${spec.key}`;
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.value = String(settings[spec.key]);
      input.style.accentColor = "#f0cb78";

      input.addEventListener("input", () => {
        const nextValue = spec.integer ? Number.parseInt(input.value, 10) : Number.parseFloat(input.value);
        settings[spec.key] = nextValue;
        label.lastElementChild.textContent = formatValue(spec.key, nextValue);
        if (spec.key === "particleCount") {
          syncParticleCount();
        }
      });

      controlWrap.appendChild(label);
      controlWrap.appendChild(input);
      panel.appendChild(controlWrap);
    });

    controlsRoot.appendChild(panel);
  }

  function drawRainbowArc() {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const cx = viewWidth / 2;
    const cy = viewHeight + settings.arcRadius * 0.15;
    const radius = settings.arcRadius;

    const gradient = ctx.createLinearGradient(0, 0, viewWidth, 0);
    baseHues.forEach((h, i) => {
      gradient.addColorStop(i / (baseHues.length - 1), hslToHex((hueOffset + h) % 360, 85, 55));
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0, true);
    ctx.lineWidth = settings.arcThickness;
    ctx.strokeStyle = gradient;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = settings.glow;
    ctx.globalAlpha = 0.9;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0, true);
    ctx.lineWidth = settings.arcThickness * 0.3;
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.35;
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  function updateAndDrawParticles(deltaSeconds) {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      p.life -= p.decay * deltaSeconds;

      if (p.life <= 0) {
        const next = createParticle();
        Object.assign(p, next);
        continue;
      }

      const hue = (hueOffset + (p.x / viewWidth) * 300) % 360;
      const color = hslToHex(hue, 90, 70);
      const alpha = p.life * 0.75;

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  syncParticleCount();

  return {
    id: "rainbow",
    name: "Prismatic Horizon",
    hasControls: true,
    start() {
      createControls();
      syncParticleCount();
    },
    stop() {
      controlsRoot.innerHTML = "";
    },
    resize() {
      syncParticleCount();
    },
    render(timestamp, deltaSeconds) {
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();

      hueOffset += settings.speed * 60 * deltaSeconds;

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#0a1628";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      drawRainbowArc();
      updateAndDrawParticles(deltaSeconds);
    }
  };
}