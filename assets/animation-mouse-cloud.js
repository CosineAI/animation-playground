import { TAU, hexToRgb, clamp } from "./utils.js";

export function createMouseCloudProject({ canvas, ctx, controlsRoot, getViewWidth, getViewHeight }) {
  const particles = [];
  const colorAlphas = [0.75, 0.7, 0.66];
  const settings = {
    particleCount: Math.round(clamp(getViewWidth() * getViewHeight() * 0.00065, 260, 900)),
    baseSpeed: 85,
    sizeVariety: 0.72,
    inertia: 0.82,
    colors: ["#1a98ff", "#7a5cff", "#ff6be6"]
  };

  let palette = [];
  let mouseX = getViewWidth() * 0.5;
  let mouseY = getViewHeight() * 0.5;
  let mouseActive = false;
  let rotation = 0;
  let explodeEnergy = 0;

  function rebuildPalette() {
    palette = settings.colors.map((color, index) => ({
      rgb: hexToRgb(color),
      alpha: colorAlphas[index]
    }));
  }

  function createParticle(index) {
    const tint = palette[index % palette.length];
    const size = 1.4 + Math.random() * (1.8 + settings.sizeVariety * 6.4);
    const mass = 0.75 + (size / 7.6) * (0.85 + Math.random() * 1.25);
    const offsetRadius = 8 + Math.random() * 140;

    return {
      x: mouseX + (Math.random() - 0.5) * 120,
      y: mouseY + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * settings.baseSpeed * 1.25,
      vy: (Math.random() - 0.5) * settings.baseSpeed * 1.25,
      mass,
      size,
      alpha: tint.alpha,
      rgb: tint.rgb,
      offsetAngle: Math.random() * TAU,
      offsetRadius,
      offsetDrift: (Math.random() - 0.5) * 2,
      spring: 7 + Math.random() * 15
    };
  }

  function applyColorsToParticles() {
    for (let i = 0; i < particles.length; i += 1) {
      const tint = palette[i % palette.length];
      const particle = particles[i];
      particle.rgb = tint.rgb;
      particle.alpha = tint.alpha;
    }
  }

  function refreshParticleSizes() {
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      const size = 1.4 + Math.random() * (1.8 + settings.sizeVariety * 6.4);
      particle.size = size;
      particle.mass = 0.75 + (size / 7.6) * (0.85 + Math.random() * 1.25);
    }
  }

  function syncParticleCount() {
    const targetCount = Math.max(40, Math.round(settings.particleCount));

    if (particles.length < targetCount) {
      const startIndex = particles.length;
      for (let i = startIndex; i < targetCount; i += 1) {
        particles.push(createParticle(i));
      }
      return;
    }

    if (particles.length > targetCount) {
      particles.length = targetCount;
    }
  }

  function seedParticles() {
    particles.length = 0;
    syncParticleCount();
  }

  function formatRangeValue(key, value) {
    if (key === "sizeVariety" || key === "inertia") {
      return Number(value).toFixed(2);
    }
    return String(Math.round(value));
  }

  function appendRangeControl(panel, panelId, { key, label, min, max, step, integer }) {
    const controlWrap = document.createElement("div");
    controlWrap.className = "control-group";

    const labelEl = document.createElement("label");
    labelEl.htmlFor = `${panelId}-${key}`;
    labelEl.innerHTML = `<span>${label}</span><span>${formatRangeValue(key, settings[key])}</span>`;

    const input = document.createElement("input");
    input.type = "range";
    input.id = `${panelId}-${key}`;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(settings[key]);
    input.style.accentColor = settings.colors[0];

    input.addEventListener("input", () => {
      const nextValue = integer ? Number.parseInt(input.value, 10) : Number.parseFloat(input.value);
      settings[key] = nextValue;
      labelEl.lastElementChild.textContent = formatRangeValue(key, nextValue);

      if (key === "particleCount") {
        syncParticleCount();
      } else if (key === "sizeVariety") {
        refreshParticleSizes();
      }
    });

    controlWrap.appendChild(labelEl);
    controlWrap.appendChild(input);
    panel.appendChild(controlWrap);
  }

  function appendColorControl(panel, panelId, index) {
    const controlWrap = document.createElement("div");
    controlWrap.className = "control-group";

    const labelEl = document.createElement("label");
    labelEl.htmlFor = `${panelId}-color-${index}`;
    labelEl.innerHTML = `<span>Color ${index + 1}</span><span>${settings.colors[index]}</span>`;

    const input = document.createElement("input");
    input.type = "color";
    input.id = `${panelId}-color-${index}`;
    input.value = settings.colors[index];

    input.addEventListener("input", () => {
      settings.colors[index] = input.value;
      labelEl.lastElementChild.textContent = input.value;
      rebuildPalette();
      applyColorsToParticles();
    });

    controlWrap.appendChild(labelEl);
    controlWrap.appendChild(input);
    panel.appendChild(controlWrap);
  }

  function createControls() {
    controlsRoot.innerHTML = "";

    const panel = document.createElement("section");
    panel.className = "wave-panel";

    const title = document.createElement("h2");
    title.className = "wave-title";
    title.textContent = "Mouse cloud";
    title.style.color = settings.colors[0];
    panel.appendChild(title);

    appendRangeControl(panel, "mouse-cloud", { key: "particleCount", label: "Number of particles", min: 80, max: 1800, step: 1, integer: true });
    appendRangeControl(panel, "mouse-cloud", { key: "baseSpeed", label: "Base speed", min: 10, max: 260, step: 1, integer: true });
    appendRangeControl(panel, "mouse-cloud", { key: "sizeVariety", label: "Variety of sizes", min: 0, max: 1, step: 0.01, integer: false });
    appendRangeControl(panel, "mouse-cloud", { key: "inertia", label: "Inertia", min: 0, max: 1, step: 0.01, integer: false });

    appendColorControl(panel, "mouse-cloud", 0);
    appendColorControl(panel, "mouse-cloud", 1);
    appendColorControl(panel, "mouse-cloud", 2);

    controlsRoot.appendChild(panel);
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseActive = true;
  }

  function onPointerLeave() {
    mouseActive = false;
  }

  function onKeyDown(event) {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    explodeEnergy = 1;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      let dx = particle.x - mouseX;
      let dy = particle.y - mouseY;
      let len = Math.hypot(dx, dy);

      if (len < 0.001) {
        const angle = Math.random() * TAU;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        len = 1;
      }

      dx /= len;
      dy /= len;

      const impulse = (220 + Math.random() * (settings.baseSpeed * 8)) / particle.mass;
      const twist = (Math.random() - 0.5) * (90 + settings.baseSpeed * 0.8);

      particle.vx += dx * impulse - dy * twist / particle.mass;
      particle.vy += dy * impulse + dx * twist / particle.mass;
    }
  }

  rebuildPalette();
  seedParticles();

  return {
    id: "mouse-cloud",
    name: "Mouse cloud",
    hasControls: true,
    start() {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("keydown", onKeyDown);
      createControls();
      seedParticles();
    },
    stop() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKeyDown);
      controlsRoot.innerHTML = "";
      mouseActive = false;
      explodeEnergy = 0;
    },
    resize() {
      if (!mouseActive) {
        mouseX = getViewWidth() * 0.5;
        mouseY = getViewHeight() * 0.5;
      }
      syncParticleCount();
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();

      rotation += deltaSeconds * (0.22 + settings.baseSpeed / 320);
      explodeEnergy *= Math.exp(-deltaSeconds * 3.2);

      const centerX = viewWidth * 0.5;
      const centerY = viewHeight * 0.5;
      if (!mouseActive) {
        mouseX += (centerX - mouseX) * (1 - Math.exp(-deltaSeconds * 2.2));
        mouseY += (centerY - mouseY) * (1 - Math.exp(-deltaSeconds * 2.2));
      }

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      const sinR = Math.sin(rotation);
      const cosR = Math.cos(rotation);
      const damping = 0.93 + settings.inertia * 0.066;
      const response = 1.18 - settings.inertia * 0.72;
      const orbitSpeedFactor = 0.3 + settings.baseSpeed / 170;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];

        particle.offsetAngle += particle.offsetDrift * orbitSpeedFactor * deltaSeconds;
        const swirlAngle = particle.offsetAngle + rotation * 0.7;
        const swirlX = cosR * Math.cos(swirlAngle) - sinR * Math.sin(swirlAngle);
        const swirlY = sinR * Math.cos(swirlAngle) + cosR * Math.sin(swirlAngle);

        const desiredX = mouseX + swirlX * particle.offsetRadius;
        const desiredY = mouseY + swirlY * particle.offsetRadius;

        const ax = (desiredX - particle.x) * (particle.spring / particle.mass);
        const ay = (desiredY - particle.y) * (particle.spring / particle.mass);

        particle.vx += ax * deltaSeconds * response;
        particle.vy += ay * deltaSeconds * response;

        const jitter = (0.04 + settings.baseSpeed * 0.0014) * (1 + explodeEnergy * 0.8 + Math.sin(time + particle.offsetAngle) * 0.02);
        particle.vx += (Math.random() - 0.5) * jitter;
        particle.vy += (Math.random() - 0.5) * jitter;

        const dampingStep = Math.pow(damping, deltaSeconds * 60);
        particle.vx *= dampingStep;
        particle.vy *= dampingStep;

        const maxSpeed = (700 + settings.baseSpeed * 16) / particle.mass;
        const speed = Math.hypot(particle.vx, particle.vy);
        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          particle.vx *= scale;
          particle.vy *= scale;
        }

        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;

        if (particle.x < -260) {
          particle.x = viewWidth + 260;
        } else if (particle.x > viewWidth + 260) {
          particle.x = -260;
        }

        if (particle.y < -260) {
          particle.y = viewHeight + 260;
        } else if (particle.y > viewHeight + 260) {
          particle.y = -260;
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(${particle.rgb.r}, ${particle.rgb.g}, ${particle.rgb.b}, ${particle.alpha})`;
        ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
        ctx.fill();
      }
    }
  };
}