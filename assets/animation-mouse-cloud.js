import { TAU, hexToRgb, clamp } from "./utils.js";

export function createMouseCloudProject({ canvas, ctx, getViewWidth, getViewHeight }) {
  const particles = [];
  const palette = [
    { rgb: hexToRgb("#1a98ff"), alpha: 0.75 },
    { rgb: hexToRgb("#7a5cff"), alpha: 0.7 },
    { rgb: hexToRgb("#ff6be6"), alpha: 0.66 }
  ];

  let mouseX = getViewWidth() * 0.5;
  let mouseY = getViewHeight() * 0.5;
  let mouseActive = false;
  let rotation = 0;
  let explodeEnergy = 0;

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

      const impulse = (260 + Math.random() * 520) / particle.mass;
      const twist = (Math.random() - 0.5) * 140;

      particle.vx += dx * impulse - dy * twist / particle.mass;
      particle.vy += dy * impulse + dx * twist / particle.mass;
    }
  }

  function seedParticles() {
    particles.length = 0;

    const count = Math.round(clamp(getViewWidth() * getViewHeight() * 0.00065, 260, 900));

    for (let i = 0; i < count; i += 1) {
      const tint = palette[i % palette.length];
      const size = 1.4 + Math.random() * 6.2;
      const mass = 0.75 + (size / 7.6) * (0.85 + Math.random() * 1.25);
      const offsetRadius = 8 + Math.random() * 140;

      particles.push({
        x: mouseX + (Math.random() - 0.5) * 120,
        y: mouseY + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        mass,
        size,
        alpha: tint.alpha,
        rgb: tint.rgb,
        offsetAngle: Math.random() * TAU,
        offsetRadius,
        offsetSpeed: (Math.random() - 0.5) * 0.9,
        spring: 7 + Math.random() * 15
      });
    }
  }

  seedParticles();

  return {
    id: "mouse-cloud",
    name: "Mouse cloud",
    hasControls: false,
    start() {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("keydown", onKeyDown);
      seedParticles();
    },
    stop() {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKeyDown);
      mouseActive = false;
      explodeEnergy = 0;
    },
    resize() {
      if (!mouseActive) {
        mouseX = getViewWidth() * 0.5;
        mouseY = getViewHeight() * 0.5;
      }
      seedParticles();
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();

      rotation += deltaSeconds * 0.55;
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
      const damping = 0.987;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];

        particle.offsetAngle += particle.offsetSpeed * deltaSeconds;
        const swirlAngle = particle.offsetAngle + rotation * 0.7;
        const swirlX = cosR * Math.cos(swirlAngle) - sinR * Math.sin(swirlAngle);
        const swirlY = sinR * Math.cos(swirlAngle) + cosR * Math.sin(swirlAngle);

        const desiredX = mouseX + swirlX * particle.offsetRadius;
        const desiredY = mouseY + swirlY * particle.offsetRadius;

        const ax = (desiredX - particle.x) * (particle.spring / particle.mass);
        const ay = (desiredY - particle.y) * (particle.spring / particle.mass);

        particle.vx += ax * deltaSeconds;
        particle.vy += ay * deltaSeconds;

        const jitter = (0.08 + Math.random() * 0.08) * (1 + explodeEnergy * 0.8 + Math.sin(time + particle.offsetAngle) * 0.02);
        particle.vx += (Math.random() - 0.5) * jitter;
        particle.vy += (Math.random() - 0.5) * jitter;

        const dampingStep = Math.pow(damping, deltaSeconds * 60);
        particle.vx *= dampingStep;
        particle.vy *= dampingStep;

        const maxSpeed = 1600 / particle.mass;
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