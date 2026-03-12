import { TAU, hexToRgb, clamp } from "./utils.js";

export function createSpiralLiquidProject({ ctx, controlsRoot, getViewWidth, getViewHeight }) {
  const settings = {
    primaryColor: "#1a98ff",
    secondaryColor: "#ff6be6",
    spinSpeed: 1.2,
    spinDuration: 4,
    shape: "spokes",
    spokes: 6,
    thickness: 26,
    softness: 0.6
  };

  const offscreen = document.createElement("canvas");
  const offCtx = offscreen.getContext("2d");

  let cycleTime = 0;
  let rotation = 0;

  function resizeOffscreen() {
    offscreen.width = Math.round(getViewWidth());
    offscreen.height = Math.round(getViewHeight());
  }

  function formatValue(key, value) {
    if (key === "spinSpeed" || key === "softness") {
      return Number(value).toFixed(2);
    }
    if (key === "spinDuration") {
      return Number(value).toFixed(1);
    }
    return String(Math.round(value));
  }

  function appendRangeControl(panel, panelId, { key, label, min, max, step, integer }) {
    const controlWrap = document.createElement("div");
    controlWrap.className = "control-group";

    const labelEl = document.createElement("label");
    labelEl.htmlFor = `${panelId}-${key}`;
    labelEl.innerHTML = `<span>${label}</span><span>${formatValue(key, settings[key])}</span>`;

    const input = document.createElement("input");
    input.type = "range";
    input.id = `${panelId}-${key}`;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(settings[key]);
    input.style.accentColor = settings.secondaryColor;

    input.addEventListener("input", () => {
      const nextValue = integer ? Number.parseInt(input.value, 10) : Number.parseFloat(input.value);
      settings[key] = nextValue;
      labelEl.lastElementChild.textContent = formatValue(key, nextValue);
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
    });

    controlWrap.appendChild(labelEl);
    controlWrap.appendChild(input);
    panel.appendChild(controlWrap);
  }

  function appendSelectControl(panel, panelId, { key, label, options }) {
    const controlWrap = document.createElement("div");
    controlWrap.className = "control-group";

    const labelEl = document.createElement("label");
    labelEl.htmlFor = `${panelId}-${key}`;
    labelEl.innerHTML = `<span>${label}</span><span>${settings[key]}</span>`;

    const select = document.createElement("select");
    select.id = `${panelId}-${key}`;

    options.forEach((optionSpec) => {
      const option = document.createElement("option");
      option.value = optionSpec.value;
      option.textContent = optionSpec.label;
      select.appendChild(option);
    });

    select.value = settings[key];
    select.addEventListener("change", () => {
      settings[key] = select.value;
      labelEl.lastElementChild.textContent = settings[key];
      createControls();
    });

    controlWrap.appendChild(labelEl);
    controlWrap.appendChild(select);
    panel.appendChild(controlWrap);
  }

  function createControls() {
    controlsRoot.innerHTML = "";

    const panel = document.createElement("section");
    panel.className = "wave-panel";

    const title = document.createElement("h2");
    title.className = "wave-title";
    title.textContent = "Spiral goo";
    title.style.color = settings.secondaryColor;
    panel.appendChild(title);

    const tip = document.createElement("p");
    tip.className = "control-note";
    tip.textContent = "The spiral unwinds into straight arms, while the ends leave a liquid-like trail.";
    panel.appendChild(tip);

    appendColorControl(panel, "spiral", { key: "primaryColor", label: "Primary (base)" });
    appendColorControl(panel, "spiral", { key: "secondaryColor", label: "Secondary (disturbed)" });

    appendRangeControl(panel, "spiral", { key: "spinSpeed", label: "Spin speed", min: -6, max: 6, step: 0.01, integer: false });
    appendRangeControl(panel, "spiral", { key: "spinDuration", label: "Unwind duration", min: 0.6, max: 12, step: 0.1, integer: false });

    appendSelectControl(panel, "spiral", {
      key: "shape",
      label: "Shape",
      options: [
        { value: "spokes", label: "Spokes" },
        { value: "triangle", label: "Triangle" },
        { value: "square", label: "Square" }
      ]
    });

    if (settings.shape === "spokes") {
      appendRangeControl(panel, "spiral", { key: "spokes", label: "Spokes", min: 2, max: 16, step: 1, integer: true });
    }

    appendRangeControl(panel, "spiral", { key: "thickness", label: "Stickiness", min: 6, max: 90, step: 1, integer: true });
    appendRangeControl(panel, "spiral", { key: "softness", label: "Liquid fade", min: 0.05, max: 0.98, step: 0.01, integer: false });

    controlsRoot.appendChild(panel);
  }

  function getShapeAngles() {
    if (settings.shape === "triangle") {
      return [0, TAU / 3, (2 * TAU) / 3];
    }

    if (settings.shape === "square") {
      return [0, TAU / 4, TAU / 2, (3 * TAU) / 4];
    }

    const count = clamp(Math.round(settings.spokes), 2, 24);
    const angles = [];
    for (let i = 0; i < count; i += 1) {
      angles.push((i / count) * TAU);
    }
    return angles;
  }

  function drawArm(cx, cy, radius, baseAngle, spiralTurns, unwindT) {
    const samples = 120;
    const thickness = settings.thickness;

    const primary = hexToRgb(settings.primaryColor);
    const secondary = hexToRgb(settings.secondaryColor);

    const gradient = offCtx.createLinearGradient(cx, cy, cx + Math.cos(baseAngle) * radius, cy + Math.sin(baseAngle) * radius);
    gradient.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.08)`);
    gradient.addColorStop(0.35, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.0)`);
    gradient.addColorStop(0.7, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.6)`);
    gradient.addColorStop(1, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.9)`);

    offCtx.beginPath();

    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const r = radius * t;
      const extra = (1 - unwindT) * spiralTurns * TAU * t;
      const angle = baseAngle + extra;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (i === 0) {
        offCtx.moveTo(x, y);
      } else {
        offCtx.lineTo(x, y);
      }
    }

    offCtx.lineCap = "round";
    offCtx.lineJoin = "round";
    offCtx.strokeStyle = gradient;
    offCtx.lineWidth = thickness;
    offCtx.globalAlpha = 1;
    offCtx.stroke();

    offCtx.strokeStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.95)`;
    offCtx.lineWidth = Math.max(1.5, thickness * 0.18);
    offCtx.globalAlpha = 0.9;
    offCtx.stroke();
  }

  function paintBase(deltaSeconds) {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const rgb = hexToRgb(settings.primaryColor);

    offCtx.globalCompositeOperation = "source-over";
    offCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(1 - settings.softness, 0.02, 1)})`;
    offCtx.fillRect(0, 0, viewWidth, viewHeight);

    const fade = clamp(settings.softness, 0.05, 0.98);
    offCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp((1 - fade) * deltaSeconds * 1.8, 0.01, 0.18)})`;
    offCtx.fillRect(0, 0, viewWidth, viewHeight);
  }

  function drawToMain() {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();

    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.drawImage(offscreen, 0, 0);
  }

  resizeOffscreen();

  return {
    id: "spiral-goo",
    name: "Spiral goo",
    hasControls: true,
    start() {
      resizeOffscreen();
      createControls();
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    },
    stop() {
      controlsRoot.innerHTML = "";
    },
    resize() {
      resizeOffscreen();
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    },
    render(_timestamp, deltaSeconds) {
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();
      const cx = viewWidth * 0.5;
      const cy = viewHeight * 0.5;

      const speed = settings.spinSpeed;
      rotation += deltaSeconds * speed;

      const duration = Math.max(0.25, settings.spinDuration);
      cycleTime = (cycleTime + deltaSeconds) % duration;

      const phase = cycleTime / duration;
      const unwindT = 1 - Math.pow(phase, 1.4);

      const radius = Math.min(viewWidth, viewHeight) * 0.42;
      const spiralTurns = 1.4;

      paintBase(deltaSeconds);

      offCtx.save();
      offCtx.translate(cx, cy);
      offCtx.rotate(rotation);
      offCtx.translate(-cx, -cy);

      const angles = getShapeAngles();

      offCtx.globalCompositeOperation = "lighter";
      offCtx.shadowColor = settings.secondaryColor;
      offCtx.shadowBlur = 22 + settings.thickness * 0.22;

      for (let i = 0; i < angles.length; i += 1) {
        drawArm(cx, cy, radius, angles[i], spiralTurns, unwindT);
      }

      offCtx.restore();
      offCtx.shadowBlur = 0;
      offCtx.shadowColor = "transparent";
      offCtx.globalCompositeOperation = "source-over";

      drawToMain();
    }
  };
}
