import { TAU, clamp, hexToRgb } from "./utils.js";

function normalize(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createSpiral3dProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const strokeRgb = hexToRgb("#1a98ff");
  const particlePalette = ["#1a98ff", "#7a5cff", "#ff6be6", "#ffd38a"].map(hexToRgb);

  const settings = {
    periods: 8,
    thetaPerPeriod: TAU,
    xPerTurn: 855,
    radius: 150
  };

  const spiralLength = settings.periods * settings.xPerTurn;

  const path = [];
  const particles = [];

  let yaw = 0.6;
  let pitch = 0.25;
  let distance = 780;
  let targetX = spiralLength * 0.5;
  let targetY = 0;
  let targetZ = 0;

  let dragging = false;
  let dragMode = "orbit";
  let dragPointerId = null;
  let prevX = 0;
  let prevY = 0;

  function sampleSpiral(theta) {
    const x = (theta / TAU) * settings.xPerTurn;
    const y = settings.radius * Math.sin(theta);
    const z = settings.radius * Math.cos(theta);
    return { x, y, z };
  }

  function rebuildPath() {
    path.length = 0;

    const maxTheta = settings.periods * settings.thetaPerPeriod;
    const samples = Math.round(1100);

    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const theta = t * maxTheta;
      path.push({ theta, point: sampleSpiral(theta) });
    }
  }

  function rebuildParticles() {
    particles.length = 0;
    const count = 420;
    const maxTheta = settings.periods * settings.thetaPerPeriod;

    for (let i = 0; i < count; i += 1) {
      const palette = particlePalette[i % particlePalette.length];
      const theta = Math.random() * maxTheta;
      const base = sampleSpiral(theta);
      const phase = Math.random() * TAU;
      const wanderRadius = lerp(18, 70, Math.pow(Math.random(), 1.4));

      const radialLen = Math.hypot(base.y, base.z) || 1;
      const radialY = base.y / radialLen;
      const radialZ = base.z / radialLen;
      const tangentY = -radialZ;
      const tangentZ = radialY;

      const offsetY = (Math.sin(phase) * radialY + Math.cos(phase) * tangentY) * wanderRadius;
      const offsetZ = (Math.sin(phase) * radialZ + Math.cos(phase) * tangentZ) * wanderRadius;

      particles.push({
        theta,
        thetaSpeed: lerp(0.05, 0.22, Math.pow(Math.random(), 1.3)),
        size: lerp(1.1, 4.3, Math.pow(Math.random(), 1.8)),
        alpha: lerp(0.35, 0.85, Math.random()),
        rgb: palette,
        wanderPhase: phase,
        wanderSpeed: lerp(0.12, 0.55, Math.random()),
        wanderRadius,
        spring: lerp(1.6, 4.2, Math.random()),
        damping: lerp(0.8, 0.92, Math.random()),
        x: base.x,
        y: base.y + offsetY,
        z: base.z + offsetZ,
        vx: 0,
        vy: 0,
        vz: 0,
        depth: 0,
        sx: 0,
        sy: 0,
        scale: 1
      });
    }
  }

  function getCameraBasis() {
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);

    const camX = targetX + distance * cosPitch * cosYaw;
    const camY = targetY + distance * sinPitch;
    const camZ = targetZ + distance * cosPitch * sinYaw;

    const forward = normalize(targetX - camX, targetY - camY, targetZ - camZ);
    const worldUp = { x: 0, y: 1, z: 0 };
    let right = cross(forward, worldUp);
    const rightLen = Math.hypot(right.x, right.y, right.z);

    if (rightLen < 0.0001) {
      right = cross(forward, { x: 0, y: 0, z: 1 });
    }

    right = normalize(right.x, right.y, right.z);
    const up = cross(right, forward);

    return { camX, camY, camZ, forward, right, up };
  }

  function worldToCamera(point, basis) {
    const dx = point.x - basis.camX;
    const dy = point.y - basis.camY;
    const dz = point.z - basis.camZ;

    return {
      x: dx * basis.right.x + dy * basis.right.y + dz * basis.right.z,
      y: dx * basis.up.x + dy * basis.up.y + dz * basis.up.z,
      z: dx * basis.forward.x + dy * basis.forward.y + dz * basis.forward.z
    };
  }

  function project(pointCam, centerX, centerY, fov) {
    const scale = fov / (fov + pointCam.z);
    return {
      x: centerX + pointCam.x * scale,
      y: centerY - pointCam.y * scale,
      scale
    };
  }

  function pan(basis, dxPixels, dyPixels) {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const fov = Math.min(viewWidth, viewHeight) * 1.1;
    const sensitivity = (distance / fov) * 1.65;

    targetX -= basis.right.x * dxPixels * sensitivity;
    targetY -= basis.right.y * dxPixels * sensitivity;
    targetZ -= basis.right.z * dxPixels * sensitivity;

    targetX += basis.up.x * dyPixels * sensitivity;
    targetY += basis.up.y * dyPixels * sensitivity;
    targetZ += basis.up.z * dyPixels * sensitivity;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onPointerDown(event) {
    dragging = true;
    dragPointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);

    prevX = event.clientX;
    prevY = event.clientY;

    if (event.button === 2 || event.ctrlKey || event.metaKey || event.shiftKey) {
      dragMode = "pan";
    } else {
      dragMode = "orbit";
    }
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== dragPointerId) {
      return;
    }

    const dx = event.clientX - prevX;
    const dy = event.clientY - prevY;
    prevX = event.clientX;
    prevY = event.clientY;

    if (dragMode === "orbit") {
      yaw -= dx * 0.006;
      pitch += dy * 0.006;
      pitch = clamp(pitch, -1.35, 1.35);
      return;
    }

    const basis = getCameraBasis();
    pan(basis, dx, dy);
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

  function onWheel(event) {
    event.preventDefault();

    const zoomStrength = 1 + clamp(Math.abs(event.deltaY) / 500, 0.02, 0.2);
    if (event.deltaY > 0) {
      distance *= zoomStrength;
    } else {
      distance /= zoomStrength;
    }

    distance = clamp(distance, 60, 2400);
  }

  rebuildPath();
  rebuildParticles();

  return {
    id: "spiral-3d",
    name: "3D spiral",
    hasControls: false,
    start() {
      canvas.addEventListener("contextmenu", onContextMenu);
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
    },
    stop() {
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);

      dragging = false;
      dragPointerId = null;
      dragMode = "orbit";
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();
      const centerX = viewWidth * 0.5;
      const centerY = viewHeight * 0.5;

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      const fov = Math.min(viewWidth, viewHeight) * 1.1;
      const basis = getCameraBasis();

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      let started = false;

      for (let i = 0; i < path.length; i += 1) {
        const pointCam = worldToCamera(path[i].point, basis);
        if (pointCam.z < -fov * 0.9) {
          started = false;
          continue;
        }

        const projected = project(pointCam, centerX, centerY, fov);
        if (!started) {
          ctx.moveTo(projected.x, projected.y);
          started = true;
        } else {
          ctx.lineTo(projected.x, projected.y);
        }
      }

      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = `rgb(${strokeRgb.r}, ${strokeRgb.g}, ${strokeRgb.b})`;
      ctx.shadowColor = "rgba(26, 152, 255, 0.22)";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.6;

      const fadeSpan = 0.16;

      for (let i = 1; i < path.length; i += 1) {
        const t0 = (i - 1) / (path.length - 1);
        const t1 = i / (path.length - 1);
        const tm = (t0 + t1) * 0.5;
        const fadeIn = smoothstep(0, fadeSpan, tm);
        const fadeOut = smoothstep(0, fadeSpan, 1 - tm);
        const alpha = 0.92 * fadeIn * fadeOut;

        if (alpha <= 0.001) {
          continue;
        }

        const p0 = worldToCamera(path[i - 1].point, basis);
        const p1 = worldToCamera(path[i].point, basis);
        if (p0.z < -fov * 0.9 || p1.z < -fov * 0.9) {
          continue;
        }

        const s0 = project(p0, centerX, centerY, fov);
        const s1 = project(p1, centerX, centerY, fov);

        ctx.beginPath();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgb(${strokeRgb.r}, ${strokeRgb.g}, ${strokeRgb.b})`;
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      const maxTheta = settings.periods * settings.thetaPerPeriod;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.theta += particle.thetaSpeed * deltaSeconds * TAU;
        particle.theta %= maxTheta;

        particle.wanderPhase += particle.wanderSpeed * deltaSeconds;

        const desired = sampleSpiral(particle.theta);
        const radialLen = Math.hypot(desired.y, desired.z) || 1;
        const radialY = desired.y / radialLen;
        const radialZ = desired.z / radialLen;
        const tangentY = -radialZ;
        const tangentZ = radialY;

        const wander = Math.sin(particle.wanderPhase) * particle.wanderRadius;
        const drift = Math.cos(particle.wanderPhase * 0.7 + particle.theta) * particle.wanderRadius * 0.55;

        const offsetY = radialY * wander + tangentY * drift;
        const offsetZ = radialZ * wander + tangentZ * drift;

        const targetX = desired.x + Math.sin(time * 0.08 + particle.wanderPhase) * 8;
        const targetY = desired.y + offsetY;
        const targetZ = desired.z + offsetZ;

        const ax = (targetX - particle.x) * particle.spring;
        const ay = (targetY - particle.y) * particle.spring;
        const az = (targetZ - particle.z) * particle.spring;

        const gx = desired.x - particle.x;
        const gy = desired.y - particle.y;
        const gz = desired.z - particle.z;
        const gDistSq = gx * gx + gy * gy + gz * gz + 1600;
        const gStrength = 1200;
        const gFactor = gStrength / gDistSq;

        particle.vx += (ax + gx * gFactor) * deltaSeconds;
        particle.vy += (ay + gy * gFactor) * deltaSeconds;
        particle.vz += (az + gz * gFactor) * deltaSeconds;

        const damping = Math.pow(particle.damping, deltaSeconds * 60);
        particle.vx *= damping;
        particle.vy *= damping;
        particle.vz *= damping;

        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        particle.z += particle.vz * deltaSeconds;

        const camPoint = worldToCamera({ x: particle.x, y: particle.y, z: particle.z }, basis);

        if (camPoint.z < -fov * 0.9) {
          particle.depth = camPoint.z;
          particle.scale = 0;
          continue;
        }

        const projected = project(camPoint, centerX, centerY, fov);
        particle.sx = projected.x;
        particle.sy = projected.y;
        particle.scale = projected.scale;
        particle.depth = camPoint.z;
      }

      particles.sort((a, b) => a.depth - b.depth);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (particle.scale <= 0) {
          continue;
        }

        const depthFactor = clamp((particle.depth / distance + 1) * 0.5, 0, 1);
        const alpha = particle.alpha * (0.35 + depthFactor * 0.65);
        const radius = particle.size * particle.scale * (0.65 + depthFactor * 0.85);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${particle.rgb.r}, ${particle.rgb.g}, ${particle.rgb.b}, ${alpha})`;
        ctx.arc(particle.sx, particle.sy, radius, 0, TAU);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  };
}
