import { TAU, clamp, hexToRgb } from "./utils.js";

export function createStarfieldVortexProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const stars = [];
  const palette = [
    { rgb: hexToRgb("#f2d58a"), alpha: 0.82 },
    { rgb: hexToRgb("#8bb8c8"), alpha: 0.72 },
    { rgb: hexToRgb("#f6edd1"), alpha: 0.56 }
  ];

  let pointerX = getViewWidth() * 0.5;
  let pointerY = getViewHeight() * 0.5;
  let pointerActive = false;
  let swirlPhase = 0;

  function seedStars() {
    stars.length = 0;
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const count = Math.round(clamp(viewWidth * viewHeight * 0.00016, 120, 320));
    const maxRadius = Math.hypot(viewWidth, viewHeight) * 0.6;

    for (let i = 0; i < count; i += 1) {
      const tint = palette[i % palette.length];
      stars.push({
        angle: Math.random() * TAU,
        radius: 30 + Math.random() * maxRadius,
        radialSpeed: 38 + Math.random() * 110,
        angularSpeed: 0.9 + Math.random() * 1.8,
        size: 0.8 + Math.random() * 2.4,
        alpha: tint.alpha,
        rgb: tint.rgb,
        trail: 12 + Math.random() * 42,
        pulse: Math.random() * TAU
      });
    }
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
    pointerActive = true;
  }

  function onPointerLeave() {
    pointerActive = false;
  }

  seedStars();

  return {
    id: "starfield-vortex",
    name: "Midnight vortex",
    hasControls: false,
    start() {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      seedStars();
    },
    stop() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      pointerActive = false;
    },
    resize() {
      if (!pointerActive) {
        pointerX = getViewWidth() * 0.5;
        pointerY = getViewHeight() * 0.5;
      }
      seedStars();
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();
      const centerX = pointerActive ? pointerX : viewWidth * 0.5;
      const centerY = pointerActive ? pointerY : viewHeight * 0.5;
      const maxRadius = Math.hypot(viewWidth, viewHeight) * 0.62;

      swirlPhase += deltaSeconds * 0.32;

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#060b16";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const orbitBoost = 1 + Math.sin(swirlPhase + star.pulse) * 0.18;
        let radiusBefore = star.radius;

        star.angle += star.angularSpeed * orbitBoost * deltaSeconds;
        star.radius -= star.radialSpeed * orbitBoost * deltaSeconds;

        if (star.radius < 12) {
          star.radius = maxRadius;
          star.angle = Math.random() * TAU;
          radiusBefore = star.radius;
        }

        const tailRadius = Math.min(maxRadius, radiusBefore + star.trail);
        const x = centerX + Math.cos(star.angle) * star.radius;
        const y = centerY + Math.sin(star.angle) * star.radius * 0.72;
        const tailX = centerX + Math.cos(star.angle - star.angularSpeed * 0.028) * tailRadius;
        const tailY = centerY + Math.sin(star.angle - star.angularSpeed * 0.028) * tailRadius * 0.72;
        const pulse = 0.72 + Math.sin(time * 3.4 + star.pulse) * 0.28;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${star.rgb.r}, ${star.rgb.g}, ${star.rgb.b}, ${star.alpha * 0.24})`;
        ctx.lineWidth = star.size * 0.9;
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${star.rgb.r}, ${star.rgb.g}, ${star.rgb.b}, ${star.alpha})`;
        ctx.arc(x, y, star.size * pulse, 0, TAU);
        ctx.fill();
      }
    }
  };
}
