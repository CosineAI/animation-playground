import { TAU, clamp, hexToRgb } from "./utils.js";

export function createAuroraOrbitProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const ribbons = [
    { color: "#8fd3ff", phase: 0, speed: 0.16, amplitude: 64, width: 26, alpha: 0.12 },
    { color: "#f7dfad", phase: 1.7, speed: 0.11, amplitude: 88, width: 34, alpha: 0.1 },
    { color: "#c78bff", phase: 3.1, speed: 0.2, amplitude: 52, width: 20, alpha: 0.1 }
  ];
  const stars = [];
  const orbiters = [];
  const pointer = {
    x: 0,
    y: 0,
    active: false
  };

  function seedStars() {
    stars.length = 0;
    const count = Math.round(Math.max(80, Math.min(220, getViewWidth() * getViewHeight() * 0.00012)));

    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        radius: 0.6 + Math.random() * 1.8,
        alpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.6 + Math.random() * 1.4,
        twinklePhase: Math.random() * TAU
      });
    }
  }

  function seedOrbiters() {
    orbiters.length = 0;
    const palette = ["#f4d58d", "#9ad1ff", "#ffa8f0", "#b8ffcf"];
    const count = 140;

    for (let i = 0; i < count; i += 1) {
      const color = hexToRgb(palette[i % palette.length]);
      orbiters.push({
        lane: i % 5,
        angle: Math.random() * TAU,
        speed: 0.16 + Math.random() * 0.45,
        radiusOffset: Math.random() * 140,
        size: 1 + Math.random() * 2.8,
        pulsePhase: Math.random() * TAU,
        alpha: 0.24 + Math.random() * 0.5,
        color
      });
    }
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  function drawBackground(time, width, height) {
    const gradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      0,
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.72
    );
    gradient.addColorStop(0, "#17304a");
    gradient.addColorStop(0.45, "#0e1d30");
    gradient.addColorStop(1, "#050914");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(248, 226, 177, 0.05)";
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.84, Math.min(width, height) * 0.28 + Math.sin(time * 0.2) * 8, 0, TAU);
    ctx.fill();
  }

  function drawStars(time, width, height) {
    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      const twinkle = 0.55 + Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.45;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 244, 216, ${star.alpha * twinkle})`;
      ctx.arc(star.x * width, star.y * height, star.radius, 0, TAU);
      ctx.fill();
    }
  }

  function drawRibbon(ribbon, time, width, height) {
    ctx.beginPath();

    for (let x = 0; x <= width + 16; x += 16) {
      const nx = x / width;
      const waveA = Math.sin(nx * TAU * 1.4 + time * ribbon.speed + ribbon.phase);
      const waveB = Math.cos(nx * TAU * 3.1 - time * ribbon.speed * 0.8 + ribbon.phase * 1.3);
      const y = height * 0.32 + waveA * ribbon.amplitude + waveB * 18;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = ribbon.color;
    ctx.lineWidth = ribbon.width;
    ctx.globalAlpha = ribbon.alpha;
    ctx.lineCap = "round";
    ctx.shadowColor = ribbon.color;
    ctx.shadowBlur = 24;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawOrbiters(time, width, height) {
    const cx = pointer.active ? pointer.x : width * 0.5;
    const cy = pointer.active ? pointer.y : height * 0.52;
    const baseRadius = Math.min(width, height) * 0.16;

    for (let i = 0; i < orbiters.length; i += 1) {
      const orbiter = orbiters[i];
      const laneRadius = baseRadius + orbiter.lane * 28 + orbiter.radiusOffset * 0.22;
      const speed = orbiter.speed * (pointer.active ? 1.25 : 1);
      orbiter.angle += speed * 0.0035;

      const eccentricity = 0.5 + orbiter.lane * 0.08;
      const angle = orbiter.angle + time * speed;
      const x = cx + Math.cos(angle) * laneRadius;
      const y = cy + Math.sin(angle) * laneRadius * eccentricity;
      const pulse = 0.65 + Math.sin(time * 1.8 + orbiter.pulsePhase) * 0.35;
      const proximity = pointer.active
        ? 1 - clamp(Math.hypot(pointer.x - x, pointer.y - y) / 180, 0, 1)
        : 0;
      const alpha = orbiter.alpha + proximity * 0.45;
      const size = orbiter.size + pulse * 1.6 + proximity * 2.2;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${orbiter.color.r}, ${orbiter.color.g}, ${orbiter.color.b}, ${alpha})`;
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
  }

  seedStars();
  seedOrbiters();

  return {
    id: "aurora-orbit",
    name: "St Lucia lights",
    hasControls: false,
    start() {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      seedStars();
      seedOrbiters();
    },
    stop() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      pointer.active = false;
    },
    resize() {
      seedStars();
    },
    render(timestamp) {
      const time = timestamp * 0.001;
      const width = getViewWidth();
      const height = getViewHeight();

      drawBackground(time, width, height);
      drawStars(time, width, height);

      for (let i = 0; i < ribbons.length; i += 1) {
        drawRibbon(ribbons[i], time, width, height);
      }

      drawOrbiters(time, width, height);
    }
  };
}
