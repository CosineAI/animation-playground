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

export function createSpiral3dProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const strokeRgb = hexToRgb("#1a98ff");
  const particlePalette = ["#1a98ff", "#7a5cff", "#ff6be6", "#ffd38a"].map(hexToRgb);

  const settings = {
    periods: 8,
    thetaPerPeriod: TAU,
    baseRadius: 120,
    radiusAmplitude: 55,
    radiusFrequency: 1,
    pitchPerTurn: 38,
    zWobbleAmplitude: 24,
    zWobbleFrequency: 0.5
  };

  const path = [];
  const particles = [];

  let yaw = 0.6;
  let pitch = 0.25;
  let distance = 780;
  let targetX = 0;
  let targetY = 0;
  let targetZ = 0;

  let dragging = false;
  let dragMode = "orbit";
  let dragPointerId = null;
  let prevX = 0;
  let prevY = 0;

  function sampleSpiral(theta) {
    const r = settings.baseRadius + settings.radiusAmplitude * Math.sin(theta * settings.radiusFrequency);
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const z = (theta / TAU) * settings.pitchPerTurn + settings.zWobbleAmplitude * Math.sin(theta * settings.zWobbleFrequency);
    return { x, y, z };
  }

  function rebuildPath() {
    path.length = 0;

    const maxTheta = settings.periods * settings.thetaPerPeriod;
    const samples = Math.round(1400);

    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const theta = t * maxTheta;
      path.push({ theta, point: sampleSpiral(theta) });
    }
  }

  function rebuildParticles() {
    particles.length = 0;
    const count = 140;
    const maxTheta = settings.periods * settings.thetaPerPeriod;

    for (let i = 0; i < count; i += 1) {
      const palette = particlePalette[i % particlePalette.length];
      particles.push({
        theta: Math.random() * maxTheta,
        speed: lerp(0.7, 2.6, Math.random()),
        size: lerp(1.1, 4.2, Math.pow(Math.random(), 1.8)),
        alpha: lerp(0.55, 0.92, Math.random()),
        rgb: palette,
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

    distance = clamp(distance, 180, 2400);
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

      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = `rgb(${strokeRgb.r}, ${strokeRgb.g}, ${strokeRgb.b})`;
      ctx.shadowColor = "rgba(26, 152, 255, 0.35)";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const maxTheta = settings.periods * settings.thetaPerPeriod;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.theta += particle.speed * deltaSeconds * TAU * 0.55;
        particle.theta %= maxTheta;

        const worldPoint = sampleSpiral(particle.theta);
        const camPoint = worldToCamera(worldPoint, basis);

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
