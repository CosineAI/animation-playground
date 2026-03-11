const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const controlsRoot = document.getElementById("controls");
const controlsToggleButton = document.getElementById("controls-toggle");
const projectSelect = document.getElementById("project-select");
const TAU = Math.PI * 2;

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let lastTimestamp = performance.now();
let controlsVisible = true;
let controlsAvailable = true;

function setControlsAvailability(available) {
  controlsAvailable = available;
  controlsToggleButton.disabled = !available;

  if (!available) {
    setControlsVisibility(false);
    controlsRoot.innerHTML = "";
    return;
  }

  if (!controlsVisible) {
    setControlsVisibility(true);
  }
}

function setControlsVisibility(visible) {
  controlsVisible = visible;
  document.body.classList.toggle("controls-hidden", !visible);
  controlsToggleButton.textContent = visible ? "Hide Controls" : "Show Controls";
  controlsToggleButton.setAttribute("aria-expanded", String(visible));
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

  if (activeProject?.resize) {
    activeProject.resize();
  }
}

function createSinewaveProject() {
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

  for (let i = 0; i < waves.length; i += 1) {
    waves[i].rgb = hexToRgb(waves[i].color);
    syncParticleCount(waves[i]);
  }

  return {
    id: "sinewave",
    name: "Sinewave",
    hasControls: true,
    start() {
      createControls();
    },
    stop() {
      controlsRoot.innerHTML = "";
    },
    render(timestamp, deltaSeconds) {
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
    }
  };
}

function createSpinningParticlesProject() {
  const particles = [];
  const palette = [
    { rgb: hexToRgb("#1a98ff"), alpha: 0.75 },
    { rgb: hexToRgb("#7a5cff"), alpha: 0.66 },
    { rgb: hexToRgb("#ff6be6"), alpha: 0.62 },
    { rgb: hexToRgb("#ffd38a"), alpha: 0.58 }
  ];

  let rotation = 0;
  let rotationVelocity = 0.45;
  let mouseX = 0;
  let mouseY = 0;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let prevMouseTime = 0;
  let mouseActive = false;
  let inwardVelocity = 0;
  let dragging = false;
  let dragPointerId = null;

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const now = performance.now();

    const hadPrevious = mouseActive && prevMouseTime > 0;
    const dx = nextX - prevMouseX;
    const dy = nextY - prevMouseY;

    if (hadPrevious) {
      const dt = Math.max(0.001, (now - prevMouseTime) * 0.001);
      const vx = dx / dt;
      const vy = dy / dt;

      const cx = viewWidth * 0.5;
      const cy = viewHeight * 0.5;
      const toCenterX = cx - nextX;
      const toCenterY = cy - nextY;
      const toCenterLength = Math.max(1, Math.hypot(toCenterX, toCenterY));
      const inward = (vx * toCenterX + vy * toCenterY) / toCenterLength;
      const inwardNorm = clamp(inward / 1800, -1, 1);
      inwardVelocity = clamp(inwardVelocity * 0.72 + inwardNorm * 0.9, -0.6, 1.5);

      if (dragging && event.pointerId === dragPointerId) {
        const dragSpeed = Math.hypot(dx, dy) / dt;
        rotationVelocity += clamp(dragSpeed / 2200, 0, 1.2) * 0.12;
      }
    }

    mouseX = nextX;
    mouseY = nextY;
    prevMouseX = nextX;
    prevMouseY = nextY;
    prevMouseTime = now;
    mouseActive = true;
  }

  function onPointerLeave() {
    if (dragging) {
      return;
    }

    mouseActive = false;
    prevMouseTime = 0;
  }

  function onPointerDown(event) {
    dragging = true;
    dragPointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    onPointerMove(event);
  }

  function onPointerUp(event) {
    if (event.pointerId !== dragPointerId) {
      return;
    }

    dragging = false;
    dragPointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function seedParticles() {
    particles.length = 0;
    const count = Math.round(Math.max(400, Math.min(1400, viewWidth * viewHeight * 0.0012)));

    for (let i = 0; i < count; i += 1) {
      const u = Math.random();
      const v = Math.random();
      const theta = TAU * u;
      const phi = Math.acos(2 * v - 1);
      const baseX = Math.sin(phi) * Math.cos(theta);
      const baseY = Math.cos(phi);
      const baseZ = Math.sin(phi) * Math.sin(theta);
      const tint = palette[i % palette.length];

      particles.push({
        baseX,
        baseY,
        baseZ,
        wobbleSpeed: 0.6 + Math.random() * 1.8,
        wobblePhase: Math.random() * TAU,
        drift: 0.2 + Math.random() * 0.85,
        size: 0.85 + Math.random() * 1.8,
        alpha: tint.alpha,
        rgb: tint.rgb,
        radiusFactor: 1,
        radiusVelocity: 0,
        spring: 5 + Math.random() * 4.5,
        damping: 0.78 + Math.random() * 0.16,
        explodeBias: 0.82 + Math.random() * 0.36,
        depth: 0
      });
    }
  }

  function getExplodeStrength() {
    if (!mouseActive) {
      return 0;
    }

    const cx = viewWidth * 0.5;
    const cy = viewHeight * 0.5;
    const maxDist = Math.max(1, Math.min(viewWidth, viewHeight) * 0.5);
    const dist = Math.hypot(mouseX - cx, mouseY - cy);
    const proximity = Math.pow(1 - clamp(dist / maxDist, 0, 1), 2);
    const velocityBoost = clamp(inwardVelocity, 0, 1.2);

    return clamp(proximity + velocityBoost * 0.55, 0, 1.45);
  }

  seedParticles();

  return {
    id: "spinning-particles",
    name: "Spinning particles",
    hasControls: false,
    start() {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      seedParticles();
    },
    stop() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);

      dragging = false;
      dragPointerId = null;
      mouseActive = false;
      prevMouseTime = 0;
      inwardVelocity = 0;
      rotationVelocity = 0.45;
    },
    resize() {
      seedParticles();
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const cx = viewWidth * 0.5;
      const cy = viewHeight * 0.5;

      const baseRadius = Math.min(viewWidth, viewHeight) * 0.23;
      const fov = baseRadius * 3.2;
      const cameraZ = baseRadius * 3.9;

      inwardVelocity *= Math.exp(-deltaSeconds * 5.4);
      const explodeStrength = getExplodeStrength();
      const targetFactor = 1 + explodeStrength * 2.15;
      rotationVelocity += (0.45 - rotationVelocity) * (1 - Math.exp(-deltaSeconds * 1.8));
      rotation += deltaSeconds * (rotationVelocity + explodeStrength * 0.2);

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      const sinR = Math.sin(rotation);
      const cosR = Math.cos(rotation);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const particleTargetFactor = 1 + (targetFactor - 1) * particle.explodeBias;
        const spring = particle.spring * (1 + explodeStrength * 0.35);

        particle.radiusVelocity += (particleTargetFactor - particle.radiusFactor) * spring * deltaSeconds;
        particle.radiusVelocity *= Math.pow(particle.damping, deltaSeconds * 60);
        particle.radiusFactor = clamp(particle.radiusFactor + particle.radiusVelocity * deltaSeconds, 0.55, 4.2);

        const wobble = Math.sin(time * particle.wobbleSpeed + particle.wobblePhase) * particle.drift;
        const radius = baseRadius * particle.radiusFactor + wobble * 14;

        const rx = particle.baseX * cosR - particle.baseZ * sinR;
        const rz = particle.baseX * sinR + particle.baseZ * cosR;

        const px = rx * radius;
        const py = particle.baseY * radius;
        const pz = rz * radius;

        particle.depth = pz;
        particle.screenX = px;
        particle.screenY = py;
        particle.screenZ = pz;
      }

      particles.sort((a, b) => a.depth - b.depth);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const z = particle.screenZ + cameraZ;
        const scale = fov / (fov + z);

        const x = cx + particle.screenX * scale;
        const y = cy + particle.screenY * scale;
        const depthFactor = clamp((particle.depth / baseRadius + 1) * 0.5, 0, 1);
        const alpha = particle.alpha * (0.35 + depthFactor * 0.65);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${particle.rgb.r}, ${particle.rgb.g}, ${particle.rgb.b}, ${alpha})`;
        ctx.arc(x, y, particle.size * scale * (0.75 + depthFactor * 0.8), 0, TAU);
        ctx.fill();
      }

      
    }
  };
}

const projects = [createSinewaveProject(), createSpinningParticlesProject()];
let activeProject = null;

function populateProjectPicker() {
  projectSelect.innerHTML = "";

  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  });
}

function setActiveProject(id) {
  const nextProject = projects.find((project) => project.id === id);
  if (!nextProject || nextProject === activeProject) {
    return;
  }

  activeProject?.stop?.();
  activeProject = nextProject;

  setControlsAvailability(Boolean(activeProject.hasControls));
  if (activeProject.hasControls) {
    setControlsVisibility(true);
  }

  activeProject.start?.();
}

function render(timestamp) {
  const deltaSeconds = Math.min(0.05, (timestamp - lastTimestamp) * 0.001 || 0.016);
  lastTimestamp = timestamp;

  activeProject?.render(timestamp, deltaSeconds);
  requestAnimationFrame(render);
}

controlsToggleButton.addEventListener("click", () => {
  if (!controlsAvailable) {
    return;
  }

  setControlsVisibility(!controlsVisible);
});

projectSelect.addEventListener("change", () => {
  setActiveProject(projectSelect.value);
});

populateProjectPicker();
resizeCanvas();
setControlsVisibility(true);
setActiveProject(projects[0].id);

window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(render);