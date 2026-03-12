import { clamp, hexToRgb } from "./utils.js";

export function createSpiralLiquidProject({ ctx, controlsRoot, getViewWidth, getViewHeight }) {
  const settings = {
    baseColor: "#1470e4",
    disturbedColor: "#6addff",
    spinSpeed: 2.4,
    disturbance: 0.9,
    spread: 0.12,
    damping: 0.978,
    rodLength: 0.34,
    rodThickness: 0.03,
    rippleGain: 0.95
  };

  const offscreen = document.createElement("canvas");
  const offCtx = offscreen.getContext("2d");

  let simWidth = 0;
  let simHeight = 0;
  let cellSize = 6;

  let previousHeights = new Float32Array(0);
  let currentHeights = new Float32Array(0);
  let nextHeights = new Float32Array(0);
  let frameImage = null;

  let rodAngle = 0;
  let rodLengthCells = 0;
  let rodRadiusCells = 0;
  let rodLengthPixels = 0;
  let rodThicknessPixels = 0;

  let baseRgb = hexToRgb(settings.baseColor);
  let disturbedRgb = hexToRgb(settings.disturbedColor);

  function rebuildPalette() {
    baseRgb = hexToRgb(settings.baseColor);
    disturbedRgb = hexToRgb(settings.disturbedColor);
  }

  function updateRodGeometry() {
    const minDimensionCells = Math.min(simWidth, simHeight);
    rodLengthCells = minDimensionCells * clamp(settings.rodLength, 0.1, 0.8);
    rodRadiusCells = Math.max(1.1, rodLengthCells * clamp(settings.rodThickness, 0.008, 0.12));
    rodLengthPixels = rodLengthCells * cellSize;
    rodThicknessPixels = Math.max(8, rodRadiusCells * cellSize * 2.4);
  }

  function resizeSimulation() {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const minDimension = Math.max(1, Math.min(viewWidth, viewHeight));

    cellSize = Math.max(4, Math.round(minDimension / 170));
    simWidth = Math.max(50, Math.round(viewWidth / cellSize));
    simHeight = Math.max(50, Math.round(viewHeight / cellSize));

    offscreen.width = simWidth;
    offscreen.height = simHeight;

    const length = simWidth * simHeight;
    previousHeights = new Float32Array(length);
    currentHeights = new Float32Array(length);
    nextHeights = new Float32Array(length);
    frameImage = offCtx.createImageData(simWidth, simHeight);

    updateRodGeometry();
  }

  function formatRangeValue(key, value) {
    if (key === "spinSpeed" || key === "disturbance" || key === "spread" || key === "damping" || key === "rippleGain") {
      return Number(value).toFixed(3);
    }
    if (key === "rodLength" || key === "rodThickness") {
      return Number(value).toFixed(2);
    }
    return String(Math.round(value));
  }

  function appendRangeControl(panel, panelId, { key, label, min, max, step }) {
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
    input.style.accentColor = settings.disturbedColor;

    input.addEventListener("input", () => {
      settings[key] = Number.parseFloat(input.value);
      labelEl.lastElementChild.textContent = formatRangeValue(key, settings[key]);

      if (key === "rodLength" || key === "rodThickness") {
        updateRodGeometry();
      }
    });

    controlWrap.appendChild(labelEl);
    controlWrap.appendChild(input);
    panel.appendChild(controlWrap);
  }

  function appendColorControl(panel, panelId, { key, label }) {
    const controlWrap = document.createElement("div");
    controlWrap.className = "control-group";

    const labelEl = document.createElement("label");
    labelEl.htmlFor = `${panelId}-${key}`;
    labelEl.innerHTML = `<span>${label}</span><span>${settings[key]}</span>`;

    const input = document.createElement("input");
    input.type = "color";
    input.id = `${panelId}-${key}`;
    input.value = settings[key];

    input.addEventListener("input", () => {
      settings[key] = input.value;
      labelEl.lastElementChild.textContent = input.value;
      rebuildPalette();
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
    title.textContent = "Liquid rod";
    title.style.color = settings.baseColor;
    panel.appendChild(title);

    const tip = document.createElement("p");
    tip.className = "control-note";
    tip.textContent = "Defaults are heavily damped to keep disturbances localized. Lower damping / raise spread if you want the ripples to travel farther.";
    panel.appendChild(tip);

    appendColorControl(panel, "liquid-rod", { key: "baseColor", label: "Base liquid color" });
    appendColorControl(panel, "liquid-rod", { key: "disturbedColor", label: "Disturbed ripple color" });

    appendRangeControl(panel, "liquid-rod", { key: "spinSpeed", label: "Rod spin speed", min: -8, max: 8, step: 0.01 });
    appendRangeControl(panel, "liquid-rod", { key: "disturbance", label: "Disturbance force", min: 0, max: 2.8, step: 0.01 });
    appendRangeControl(panel, "liquid-rod", { key: "spread", label: "Ripple spread", min: 0.04, max: 0.34, step: 0.001 });
    appendRangeControl(panel, "liquid-rod", { key: "damping", label: "Damping", min: 0.94, max: 0.999, step: 0.001 });
    appendRangeControl(panel, "liquid-rod", { key: "rodLength", label: "Rod length", min: 0.12, max: 0.75, step: 0.01 });
    appendRangeControl(panel, "liquid-rod", { key: "rodThickness", label: "Rod thickness", min: 0.01, max: 0.08, step: 0.001 });
    appendRangeControl(panel, "liquid-rod", { key: "rippleGain", label: "Ripple color gain", min: 0.2, max: 2, step: 0.01 });

    controlsRoot.appendChild(panel);
  }

  function disturbDisc(centerX, centerY, force, radius) {
    const minX = Math.max(1, Math.floor(centerX - radius));
    const maxX = Math.min(simWidth - 2, Math.ceil(centerX + radius));
    const minY = Math.max(1, Math.floor(centerY - radius));
    const maxY = Math.min(simHeight - 2, Math.ceil(centerY + radius));
    const radiusSquared = radius * radius;

    for (let y = minY; y <= maxY; y += 1) {
      const row = y * simWidth;
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared > radiusSquared) {
          continue;
        }

        const falloff = 1 - distanceSquared / radiusSquared;
        const impulse = force * falloff * falloff;
        const index = row + x;

        currentHeights[index] = clamp(currentHeights[index] + impulse, -4, 4);
        previousHeights[index] = clamp(previousHeights[index] + impulse * 0.45, -4, 4);
      }
    }
  }

  function applyRodForcing(deltaSeconds) {
    const cx = simWidth * 0.5;
    const cy = simHeight * 0.5;
    const cosA = Math.cos(rodAngle);
    const sinA = Math.sin(rodAngle);
    const normalX = -sinA;
    const normalY = cosA;
    const spinDirection = settings.spinSpeed >= 0 ? 1 : -1;

    const samples = Math.max(12, Math.round(rodLengthCells * 2));
    const sideOffset = rodRadiusCells * 1.1;
    const baseForce = clamp(deltaSeconds * Math.abs(settings.spinSpeed) * 13.5 * settings.disturbance, 0.01, 1.3) * spinDirection;

    for (let i = 0; i < samples; i += 1) {
      const t = i / (samples - 1) - 0.5;
      const px = cx + cosA * (t * rodLengthCells);
      const py = cy + sinA * (t * rodLengthCells);
      const edgeBoost = 1 + Math.abs(t) * 1.1;

      disturbDisc(px + normalX * sideOffset, py + normalY * sideOffset, baseForce * edgeBoost, rodRadiusCells * 1.7);
      disturbDisc(px - normalX * sideOffset, py - normalY * sideOffset, -baseForce * edgeBoost, rodRadiusCells * 1.7);
    }

    const halfLength = rodLengthCells * 0.5;
    disturbDisc(cx + cosA * halfLength, cy + sinA * halfLength, baseForce * 2.2, rodRadiusCells * 2.4);
    disturbDisc(cx - cosA * halfLength, cy - sinA * halfLength, -baseForce * 2.2, rodRadiusCells * 2.4);
  }

  function simulateStep(deltaSeconds) {
    rodAngle += settings.spinSpeed * deltaSeconds;
    applyRodForcing(deltaSeconds);

    const tension = clamp(settings.spread, 0.02, 0.5);
    const dampingStep = Math.pow(clamp(settings.damping, 0.9, 0.9999), clamp(deltaSeconds * 60, 0.4, 3));

    for (let y = 1; y < simHeight - 1; y += 1) {
      const row = y * simWidth;
      for (let x = 1; x < simWidth - 1; x += 1) {
        const index = row + x;
        const laplacian =
          currentHeights[index - 1] +
          currentHeights[index + 1] +
          currentHeights[index - simWidth] +
          currentHeights[index + simWidth] -
          currentHeights[index] * 4;

        nextHeights[index] = (currentHeights[index] * 2 - previousHeights[index] + laplacian * tension) * dampingStep;
      }
    }

    for (let x = 0; x < simWidth; x += 1) {
      nextHeights[x] = 0;
      nextHeights[(simHeight - 1) * simWidth + x] = 0;
    }

    for (let y = 0; y < simHeight; y += 1) {
      const row = y * simWidth;
      nextHeights[row] = 0;
      nextHeights[row + simWidth - 1] = 0;
    }

    const temp = previousHeights;
    previousHeights = currentHeights;
    currentHeights = nextHeights;
    nextHeights = temp;
  }

  function simulate(deltaSeconds) {
    let remaining = Math.max(0, deltaSeconds);
    const maxStep = 1 / 90;
    let steps = 0;

    while (remaining > 0 && steps < 5) {
      const step = Math.min(maxStep, remaining);
      simulateStep(step);
      remaining -= step;
      steps += 1;
    }
  }

  function drawLiquid() {
    const data = frameImage.data;
    let pointer = 0;

    for (let y = 0; y < simHeight; y += 1) {
      const row = y * simWidth;

      for (let x = 0; x < simWidth; x += 1) {
        const index = row + x;
        const height = currentHeights[index];

        const left = x > 0 ? currentHeights[index - 1] : height;
        const right = x < simWidth - 1 ? currentHeights[index + 1] : height;
        const up = y > 0 ? currentHeights[index - simWidth] : height;
        const down = y < simHeight - 1 ? currentHeights[index + simWidth] : height;

        const gx = right - left;
        const gy = down - up;
        const gradient = Math.hypot(gx, gy);
        const disturbedAmount = clamp((Math.abs(height) * 0.38 + gradient * 0.65) * settings.rippleGain, 0, 1);
        const light = clamp(0.84 + gx * 0.16 + gy * 0.12, 0.55, 1.25);

        const mixedR = baseRgb.r + (disturbedRgb.r - baseRgb.r) * disturbedAmount;
        const mixedG = baseRgb.g + (disturbedRgb.g - baseRgb.g) * disturbedAmount;
        const mixedB = baseRgb.b + (disturbedRgb.b - baseRgb.b) * disturbedAmount;

        data[pointer] = clamp(mixedR * light, 0, 255);
        data[pointer + 1] = clamp(mixedG * light, 0, 255);
        data[pointer + 2] = clamp(mixedB * light, 0, 255);
        data[pointer + 3] = 255;
        pointer += 4;
      }
    }

    offCtx.putImageData(frameImage, 0, 0);

    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();

    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, viewWidth, viewHeight);
  }

  function drawRod() {
    const cx = getViewWidth() * 0.5;
    const cy = getViewHeight() * 0.5;
    const halfLength = rodLengthPixels * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rodAngle);
    ctx.lineCap = "round";

    ctx.strokeStyle = "rgba(232, 247, 255, 0.88)";
    ctx.lineWidth = rodThicknessPixels;
    ctx.beginPath();
    ctx.moveTo(-halfLength, 0);
    ctx.lineTo(halfLength, 0);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${disturbedRgb.r}, ${disturbedRgb.g}, ${disturbedRgb.b}, 0.95)`;
    ctx.lineWidth = rodThicknessPixels * 0.42;
    ctx.beginPath();
    ctx.moveTo(-halfLength * 0.96, 0);
    ctx.lineTo(halfLength * 0.96, 0);
    ctx.stroke();

    ctx.restore();
  }

  resizeSimulation();

  return {
    id: "spiral-goo",
    name: "Liquid rod",
    hasControls: true,
    start() {
      createControls();
      resizeSimulation();
    },
    stop() {
      controlsRoot.innerHTML = "";
    },
    resize() {
      resizeSimulation();
    },
    render(_timestamp, deltaSeconds) {
      simulate(deltaSeconds);
      drawLiquid();
      drawRod();
    }
  };
}