import { TAU, clamp } from "./utils.js";

export function createRadarTelemetryProject({ ctx, controlsRoot, getViewWidth, getViewHeight }) {
  const services = [
    { id: "ingest", label: "telemetry-ingest", x: 0.16, y: 0.28, color: "#69d2e7" },
    { id: "decoder", label: "rtp-v3-decoder", x: 0.38, y: 0.44, color: "#f4d35e" },
    { id: "tracker", label: "track-fusion", x: 0.62, y: 0.36, color: "#8bd17c" },
    { id: "sim", label: "sim-runner", x: 0.81, y: 0.54, color: "#d991c2" }
  ];

  const events = [];
  const testRows = [
    { name: "decoder/radar-v3.spec.ts", state: "PASS", offset: 0.0 },
    { name: "tracking/fusion-radar.spec.ts", state: "PASS", offset: 0.28 },
    { name: "simulations/radar-sweep.e2e.ts", state: "PASS", offset: 0.56 },
    { name: "ci/pr-4821-smoke.yml", state: "READY", offset: 0.84 }
  ];

  const settings = {
    packetRate: 44,
    sweepSpeed: 0.72,
    validationLoad: 78,
    trackCount: 18
  };

  let packets = [];
  let targets = [];
  let sequence = 8000;
  let packetBudget = 0;

  function createTarget(index) {
    const ring = 0.18 + Math.random() * 0.72;
    const angle = Math.random() * TAU;
    return {
      id: `trk-${421 + index}`,
      ring,
      angle,
      velocity: (Math.random() - 0.5) * 0.12,
      signal: 0.45 + Math.random() * 0.55,
      size: 2.5 + Math.random() * 3.5
    };
  }

  function syncTargets() {
    const targetCount = Math.max(4, Math.round(settings.trackCount));
    while (targets.length < targetCount) {
      targets.push(createTarget(targets.length));
    }
    if (targets.length > targetCount) {
      targets.length = targetCount;
    }
  }

  function servicePoint(service) {
    return {
      x: getViewWidth() * service.x,
      y: getViewHeight() * service.y
    };
  }

  function createPacket() {
    const source = services[Math.floor(Math.random() * (services.length - 1))];
    const target = services[services.indexOf(source) + 1];
    const sourcePoint = servicePoint(source);
    const targetPoint = servicePoint(target);

    sequence += 1;
    return {
      source,
      target,
      sourceX: sourcePoint.x,
      sourceY: sourcePoint.y,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
      progress: 0,
      speed: 0.36 + Math.random() * 0.42,
      label: `RTP3-${sequence}`,
      size: 2 + Math.random() * 2.2,
      alpha: 0.7 + Math.random() * 0.3
    };
  }

  function createControls() {
    controlsRoot.innerHTML = "";

    const panel = document.createElement("section");
    panel.className = "wave-panel";

    const title = document.createElement("h2");
    title.className = "wave-title";
    title.textContent = "Radar telemetry protocol";
    title.style.color = "#69d2e7";
    panel.appendChild(title);

    const tip = document.createElement("p");
    tip.className = "control-note";
    tip.textContent = "Mock rollout view: RTP v3 packets, decoder checks, simulations, and PR readiness";
    panel.appendChild(tip);

    appendRangeControl(panel, "radar-telemetry", { key: "packetRate", label: "Packet rate", min: 8, max: 120, step: 1, integer: true });
    appendRangeControl(panel, "radar-telemetry", { key: "sweepSpeed", label: "Radar sweep", min: 0.15, max: 2.4, step: 0.01, integer: false });
    appendRangeControl(panel, "radar-telemetry", { key: "validationLoad", label: "CI validation", min: 10, max: 100, step: 1, integer: true });
    appendRangeControl(panel, "radar-telemetry", { key: "trackCount", label: "Sim tracks", min: 4, max: 44, step: 1, integer: true });

    controlsRoot.appendChild(panel);
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
    input.style.accentColor = "#69d2e7";

    input.addEventListener("input", () => {
      const nextValue = integer ? Number.parseInt(input.value, 10) : Number.parseFloat(input.value);
      settings[key] = nextValue;
      labelEl.lastElementChild.textContent = formatValue(key, nextValue);

      if (key === "trackCount") {
        syncTargets();
      }
    });

    controlWrap.appendChild(labelEl);
    controlWrap.appendChild(input);
    panel.appendChild(controlWrap);
  }

  function formatValue(key, value) {
    if (key === "packetRate") {
      return `${Math.round(value)}k/s`;
    }
    if (key === "sweepSpeed") {
      return `${Number(value).toFixed(2)}x`;
    }
    if (key === "validationLoad") {
      return `${Math.round(value)}%`;
    }
    return String(Math.round(value));
  }

  function drawBackground(viewWidth, viewHeight) {
    const gradient = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
    gradient.addColorStop(0, "#071825");
    gradient.addColorStop(0.55, "#102636");
    gradient.addColorStop(1, "#160f1b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.strokeStyle = "rgba(105, 210, 231, 0.08)";
    ctx.lineWidth = 1;
    const grid = 44;
    for (let x = 0; x < viewWidth; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewHeight);
      ctx.stroke();
    }
    for (let y = 0; y < viewHeight; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewWidth, y);
      ctx.stroke();
    }
  }

  function drawRadar(time, viewWidth, viewHeight) {
    const cx = viewWidth * 0.2;
    const cy = viewHeight * 0.62;
    const radius = Math.min(viewWidth, viewHeight) * 0.22;
    const sweep = time * settings.sweepSpeed;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = "rgba(105, 210, 231, 0.28)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * i * 0.25, 0, TAU);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();

    const sweepAngle = sweep % TAU;
    const sweepGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    sweepGradient.addColorStop(0, "rgba(105, 210, 231, 0.36)");
    sweepGradient.addColorStop(1, "rgba(105, 210, 231, 0)");
    ctx.fillStyle = sweepGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, sweepAngle - 0.28, sweepAngle, false);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(105, 210, 231, 0.82)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweepAngle) * radius, Math.sin(sweepAngle) * radius);
    ctx.stroke();

    ctx.font = "12px Georgia, 'Times New Roman', serif";
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      target.angle += target.velocity * 0.016;
      const x = Math.cos(target.angle) * radius * target.ring;
      const y = Math.sin(target.angle) * radius * target.ring;
      const pulse = 0.65 + Math.sin(time * 4 + i) * 0.25;

      ctx.fillStyle = `rgba(139, 209, 124, ${target.signal * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, target.size, 0, TAU);
      ctx.fill();

      if (i % 5 === 0) {
        ctx.fillStyle = "rgba(245, 225, 176, 0.68)";
        ctx.fillText(target.id, x + 7, y - 5);
      }
    }

    ctx.restore();
  }

  function drawServiceGraph(time) {
    ctx.font = "13px Georgia, 'Times New Roman', serif";

    for (let i = 0; i < services.length - 1; i += 1) {
      const start = servicePoint(services[i]);
      const end = servicePoint(services[i + 1]);
      ctx.strokeStyle = "rgba(245, 225, 176, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    for (let i = 0; i < services.length; i += 1) {
      const service = services[i];
      const point = servicePoint(service);
      const pulse = 0.72 + Math.sin(time * 2.2 + i) * 0.18;

      ctx.fillStyle = "rgba(13, 27, 42, 0.88)";
      roundRect(point.x - 72, point.y - 24, 144, 48, 14);
      ctx.fill();
      ctx.strokeStyle = service.color;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = service.color;
      ctx.beginPath();
      ctx.arc(point.x - 51, point.y, 5, 0, TAU);
      ctx.fill();

      ctx.fillStyle = "#f5e1b0";
      ctx.fillText(service.label, point.x - 39, point.y + 4);
    }
  }

  function drawPackets(deltaSeconds) {
    packetBudget += settings.packetRate * 0.045 * deltaSeconds;
    while (packetBudget >= 1 && packets.length < 130) {
      packets.push(createPacket());
      packetBudget -= 1;
    }

    ctx.font = "11px Georgia, 'Times New Roman', serif";

    for (let i = packets.length - 1; i >= 0; i -= 1) {
      const packet = packets[i];
      packet.progress += packet.speed * deltaSeconds;

      if (packet.progress >= 1) {
        events.unshift(`${packet.label} decoded by ${packet.target.id}`);
        if (events.length > 6) {
          events.length = 6;
        }
        packets.splice(i, 1);
        continue;
      }

      const eased = packet.progress * packet.progress * (3 - 2 * packet.progress);
      const x = packet.sourceX + (packet.targetX - packet.sourceX) * eased;
      const y = packet.sourceY + (packet.targetY - packet.sourceY) * eased + Math.sin(eased * Math.PI) * -34;

      ctx.fillStyle = `rgba(105, 210, 231, ${packet.alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, packet.size, 0, TAU);
      ctx.fill();

      if (i % 9 === 0) {
        ctx.fillStyle = "rgba(245, 225, 176, 0.62)";
        ctx.fillText(packet.label, x + 7, y - 7);
      }
    }
  }

  function drawStatusPanels(time, viewWidth, viewHeight) {
    const panelX = viewWidth * 0.55;
    const panelY = viewHeight * 0.59;
    const panelWidth = Math.min(430, viewWidth * 0.38);

    drawPanel(panelX, panelY, panelWidth, 168, "simulation and test run");

    ctx.font = "13px Georgia, 'Times New Roman', serif";
    for (let i = 0; i < testRows.length; i += 1) {
      const row = testRows[i];
      const y = panelY + 38 + i * 28;
      const active = (time * 0.35 + row.offset) % 1;
      const alpha = 0.65 + Math.sin(active * TAU) * 0.2;

      ctx.fillStyle = "rgba(245, 225, 176, 0.82)";
      ctx.fillText(row.name, panelX + 18, y);
      ctx.fillStyle = row.state === "READY" ? `rgba(244, 211, 94, ${alpha})` : `rgba(139, 209, 124, ${alpha})`;
      ctx.fillText(row.state, panelX + panelWidth - 72, y);
    }

    const meterY = panelY + 142;
    ctx.fillStyle = "rgba(245, 225, 176, 0.14)";
    roundRect(panelX + 18, meterY, panelWidth - 36, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#69d2e7";
    roundRect(panelX + 18, meterY, (panelWidth - 36) * (settings.validationLoad / 100), 8, 4);
    ctx.fill();

    drawPanel(panelX, panelY - 160, panelWidth, 124, "pull request");
    ctx.font = "14px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#f5e1b0";
    ctx.fillText("PR #4821 · add radar telemetry protocol", panelX + 18, panelY - 112);
    ctx.fillStyle = "#8bd17c";
    ctx.fillText("checks passing · simulations attached · awaiting review", panelX + 18, panelY - 82);
    ctx.fillStyle = "rgba(245, 225, 176, 0.68)";
    ctx.fillText("+ decoder, ingest mapping, track fusion fixtures", panelX + 18, panelY - 54);

    drawPanel(24, 80, Math.min(430, viewWidth * 0.42), 150, "recent packets");
    ctx.font = "12px Georgia, 'Times New Roman', serif";
    for (let i = 0; i < events.length; i += 1) {
      ctx.fillStyle = `rgba(245, 225, 176, ${0.84 - i * 0.08})`;
      ctx.fillText(events[i], 42, 122 + i * 19);
    }
  }

  function drawPanel(x, y, width, height, title) {
    ctx.fillStyle = "rgba(13, 27, 42, 0.82)";
    roundRect(x, y, width, height, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(105, 210, 231, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "12px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "rgba(245, 225, 176, 0.66)";
    ctx.fillText(title.toUpperCase(), x + 18, y + 24);
  }

  function drawHeader(viewWidth) {
    ctx.font = "18px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#f5e1b0";
    ctx.fillText("Radar telemetry protocol rollout", 26, 42);

    ctx.font = "12px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "rgba(245, 225, 176, 0.7)";
    ctx.fillText("RTP v3 · binary frame decoder · simulation replay · tracking platform PR", 28, 62);

    ctx.textAlign = "right";
    ctx.fillStyle = "#8bd17c";
    ctx.fillText("CI green", viewWidth - 28, 42);
    ctx.fillStyle = "rgba(245, 225, 176, 0.68)";
    ctx.fillText(`${Math.round(settings.packetRate)}k packets/s · ${targets.length} active tracks`, viewWidth - 28, 62);
    ctx.textAlign = "left";
  }

  function roundRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  }

  syncTargets();

  return {
    id: "radar-telemetry",
    name: "Radar telemetry rollout",
    hasControls: true,
    start() {
      createControls();
      syncTargets();
      packets = [];
      events.length = 0;
      events.push("RTP3-8000 schema fixture loaded");
      events.push("decoder handshake accepted");
      events.push("simulation replay queued");
    },
    stop() {
      controlsRoot.innerHTML = "";
      packets = [];
    },
    resize() {
      syncTargets();
    },
    render(timestamp, deltaSeconds) {
      const time = timestamp * 0.001;
      const viewWidth = getViewWidth();
      const viewHeight = getViewHeight();

      settings.packetRate = clamp(settings.packetRate, 8, 120);
      settings.validationLoad = clamp(settings.validationLoad, 10, 100);

      drawBackground(viewWidth, viewHeight);
      drawHeader(viewWidth);
      drawServiceGraph(time);
      drawPackets(deltaSeconds);
      drawRadar(time, viewWidth, viewHeight);
      drawStatusPanels(time, viewWidth, viewHeight);
    }
  };
}
