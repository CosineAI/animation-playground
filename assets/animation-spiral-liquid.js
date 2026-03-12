import { clamp } from "./utils.js";

export function createSpiralLiquidProject({ ctx, controlsRoot, getViewWidth, getViewHeight }) {
  const baseColor = { r: 20, g: 112, b: 228 };
  const disturbedColor = { r: 106, g: 221, b: 255 };

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
  const rodSpinSpeed = 2.6;
  let rodLengthCells = 0;
  let rodRadiusCells = 0;
  let rodLengthPixels = 0;
  let rodThicknessPixels = 0;

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

    rodLengthCells = Math.min(simWidth, simHeight) * 0.34;
    rodRadiusCells = Math.max(1.2, rodLengthCells * 0.03);
    rodLengthPixels = rodLengthCells * cellSize;
    rodThicknessPixels = Math.max(10, rodRadiusCells * cellSize * 2.5);
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

    const samples = Math.max(12, Math.round(rodLengthCells * 2));
    const sideOffset = rodRadiusCells * 1.1;
    const baseForce = clamp(deltaSeconds * rodSpinSpeed * 16, 0.05, 0.75);

    for (let i = 0; i < samples; i += 1) {
      const t = i / (samples - 1) - 0.5;
      const px = cx + cosA * (t * rodLengthCells);
      const py = cy + sinA * (t * rodLengthCells);
      const edgeBoost = 1 + Math.abs(t) * 1.15;

      disturbDisc(px + normalX * sideOffset, py + normalY * sideOffset, baseForce * edgeBoost, rodRadiusCells * 1.7);
      disturbDisc(px - normalX * sideOffset, py - normalY * sideOffset, -baseForce * edgeBoost, rodRadiusCells * 1.7);
    }

    const halfLength = rodLengthCells * 0.5;
    disturbDisc(cx + cosA * halfLength, cy + sinA * halfLength, baseForce * 2.2, rodRadiusCells * 2.4);
    disturbDisc(cx - cosA * halfLength, cy - sinA * halfLength, -baseForce * 2.2, rodRadiusCells * 2.4);
  }

  function simulateStep(deltaSeconds) {
    rodAngle += rodSpinSpeed * deltaSeconds;
    applyRodForcing(deltaSeconds);

    const tension = 0.2;
    const damping = Math.pow(0.9925, clamp(deltaSeconds * 60, 0.5, 2.5));

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

        nextHeights[index] = (currentHeights[index] * 2 - previousHeights[index] + laplacian * tension) * damping;
      }
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
        const disturbedAmount = clamp(Math.abs(height) * 0.38 + gradient * 0.65, 0, 1);
        const light = clamp(0.84 + gx * 0.16 + gy * 0.12, 0.55, 1.25);

        const mixedR = baseColor.r + (disturbedColor.r - baseColor.r) * disturbedAmount;
        const mixedG = baseColor.g + (disturbedColor.g - baseColor.g) * disturbedAmount;
        const mixedB = baseColor.b + (disturbedColor.b - baseColor.b) * disturbedAmount;

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

    ctx.strokeStyle = "rgba(147, 197, 255, 0.95)";
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
    hasControls: false,
    start() {
      controlsRoot.innerHTML = "";
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