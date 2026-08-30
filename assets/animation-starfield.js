import { TAU, clamp } from "./utils.js";

export function createStarfieldProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const stars = [];

  let mouseX = 0;
  let mouseY = 0;
  let mouseActive = false;

  function seedStars() {
    stars.length = 0;
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const count = Math.round(clamp(viewWidth * viewHeight * 0.00055, 320, 1400));

    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: Math.random(),
        size: 0.55 + Math.random() * 1.65,
        twinkle: Math.random() * TAU
      });
    }
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

  seedStars();

  return {
    id: "starfield",
    name: "Starfield",
    hasControls: false,
    start() {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      seedStars();
    },
    stop() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      mouseActive = false;
    },
    resize() {
      seedStars();
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();
      const cx = viewWidth * 0.5;
      const cy = viewHeight * 0.5;
      const fov = Math.min(viewWidth, viewHeight) * 0.9;

      let driftX = 0;
      let driftY = 0;
      if (mouseActive) {
        driftX = (mouseX - cx) / Math.max(1, cx);
        driftY = (mouseY - cy) / Math.max(1, cy);
      }

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        star.z -= deltaSeconds * (0.16 + star.size * 0.05);
        if (star.z <= 0.02) {
          star.z = 1;
          star.x = (Math.random() - 0.5) * 2;
          star.y = (Math.random() - 0.5) * 2;
          star.size = 0.55 + Math.random() * 1.65;
        }

        star.twinkle += deltaSeconds * (0.8 + star.size);

        const px = star.x + driftX * (1 - star.z) * 0.15;
        const py = star.y + driftY * (1 - star.z) * 0.15;
        const scale = fov / (fov + star.z * fov);

        const x = cx + px * cx * scale;
        const y = cy + py * cy * scale;
        const alpha = 0.25 + Math.pow(1 - star.z, 1.4) * 0.7;
        const twinkle = 0.7 + Math.sin(star.twinkle + time) * 0.3;

        ctx.beginPath();
        ctx.fillStyle = `rgba(40, 50, 90, ${alpha * twinkle})`;
        ctx.arc(x, y, star.size * (0.85 + (1 - star.z) * 1.6), 0, TAU);
        ctx.fill();
      }
    }
  };
}
