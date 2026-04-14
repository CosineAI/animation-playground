import { TAU, hexToRgb, clamp } from "./utils.js";

export function createSpinningParticlesProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const particles = [];
  const palette = [
    { rgb: hexToRgb("#d8b36b"), alpha: 0.75 },
    { rgb: hexToRgb("#7f5b3a"), alpha: 0.66 },
    { rgb: hexToRgb("#3b6176"), alpha: 0.62 },
    { rgb: hexToRgb("#f2e0b3"), alpha: 0.58 }
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

      const cx = getViewWidth() * 0.5;
      const cy = getViewHeight() * 0.5;
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
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
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

    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
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
    name: "Cursed doubloons",
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
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();
      const cx = viewWidth * 0.5;
      const cy = viewHeight * 0.5;

      const baseRadius = Math.min(viewWidth, viewHeight) * 0.23;
      const fov = baseRadius * 3.2;
      const cameraZ = baseRadius * 3.9;

      inwardVelocity *= Math.exp(-deltaSeconds * 5.4);
      const explodeStrength = getExplodeStrength();
      const targetFactor = 1 + explodeStrength * 2.15;
      rotationVelocity += (0.45 - rotationVelocity) * (1 - Math.exp(-deltaSeconds * 0.08));
      rotation += deltaSeconds * (rotationVelocity + explodeStrength * 0.2);

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#0b1420";
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
