import { createSinewaveProject } from "./animation-sinewave.js";
import { createSpinningParticlesProject } from "./animation-spinning-particles.js";
import { createMouseCloudProject } from "./animation-mouse-cloud.js";

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const controlsRoot = document.getElementById("controls");
const controlsToggleButton = document.getElementById("controls-toggle");
const projectSelect = document.getElementById("project-select");

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let lastTimestamp = performance.now();
let controlsVisible = true;
let controlsAvailable = true;
let activeProject = null;

function setControlsAvailability(available) {
  controlsAvailable = available;
  controlsToggleButton.disabled = !available;

  if (!available) {
    setControlsVisibility(false);
    controlsRoot.innerHTML = "";
    return;
  }

  if (!controlsVisible) {
    setControlsVisibility(true);
  }
}

function setControlsVisibility(visible) {
  controlsVisible = visible;
  document.body.classList.toggle("controls-hidden", !visible);
  controlsToggleButton.textContent = visible ? "Hide Controls" : "Show Controls";
  controlsToggleButton.setAttribute("aria-expanded", String(visible));
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;

  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (activeProject?.resize) {
    activeProject.resize();
  }
}

const environment = {
  canvas,
  ctx,
  controlsRoot,
  getViewWidth: () => viewWidth,
  getViewHeight: () => viewHeight
};

const projects = [
  createSinewaveProject(environment),
  createSpinningParticlesProject(environment),
  createMouseCloudProject(environment)
];

function populateProjectPicker() {
  projectSelect.innerHTML = "";

  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  });
}

function setActiveProject(id) {
  const nextProject = projects.find((project) => project.id === id);
  if (!nextProject || nextProject === activeProject) {
    return;
  }

  activeProject?.stop?.();
  activeProject = nextProject;

  setControlsAvailability(Boolean(activeProject.hasControls));
  if (activeProject.hasControls) {
    setControlsVisibility(true);
  }

  activeProject.start?.();
}

function render(timestamp) {
  const deltaSeconds = Math.min(0.05, (timestamp - lastTimestamp) * 0.001 || 0.016);
  lastTimestamp = timestamp;

  activeProject?.render(timestamp, deltaSeconds);
  requestAnimationFrame(render);
}

controlsToggleButton.addEventListener("click", () => {
  if (!controlsAvailable) {
    return;
  }

  setControlsVisibility(!controlsVisible);
});

projectSelect.addEventListener("change", () => {
  setActiveProject(projectSelect.value);
});

populateProjectPicker();
resizeCanvas();
setControlsVisibility(true);
setActiveProject(projects[0].id);

window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(render);