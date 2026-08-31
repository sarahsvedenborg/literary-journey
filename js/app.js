import { loadAtlas } from "./data.js";
import { createPanel } from "./panel.js";
import { renderJourney, replayRoute } from "./journey.js";
import { renderTimeline } from "./timeline.js";
import { renderIdeas } from "./ideas.js";
import { renderWorlds } from "./worlds.js";
import { createTour } from "./tour.js";

const ATLAS_VIEWS = ["journey", "timeline", "ideas", "worlds"];
let tourApi = null;
let activeRoute = null;

init().catch((error) => {
  const lede = document.getElementById("lede");
  if (lede) lede.textContent = error.message;
});

async function init() {
  const atlas = await loadAtlas();
  document.getElementById("lede").textContent = atlas.meta.description;
  document.getElementById("colophon").textContent =
    `${atlas.meta.title} · ${atlas.meta.year} · ${atlas.books.length} volumes · last inscribed ${atlas.meta.lastUpdated}`;

  const panel = createPanel(atlas, {
    onNavigate: () => {},
  });

  const context = {
    onOpenBook: (id) => panel.open(id),
  };

  renderJourney(atlas, context);
  renderTimeline(atlas, context);
  renderIdeas(atlas, context);
  renderWorlds(atlas, context);

  tourApi = createTour(atlas, {
    onOpenBook: (id) => panel.open(id),
    onExit: (mode) => setMode(mode),
    onEnterAtlas: () => setMode("journey"),
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.view));
  });
  document.getElementById("return-tour")?.addEventListener("click", () => setMode("tour"));

  window.addEventListener("hashchange", () => {
    setMode(parseHash(), { skipHash: true });
  });

  setMode(parseHash(), { skipHash: true });
}

function parseHash() {
  const value = window.location.hash.replace("#", "");
  if (!value || value === "enter") return "enter";
  if (value === "tour") return "tour";
  if (ATLAS_VIEWS.includes(value)) return value;
  return "enter";
}

async function setMode(name, { skipHash } = {}) {
  if (!name) return;
  if (activeRoute === name) {
    if (!skipHash) window.location.hash = name === "enter" ? "" : name;
    return;
  }
  activeRoute = name;
  const mode = name === "enter" ? "enter" : name === "tour" ? "tour" : "atlas";
  const previous = document.body.dataset.mode;
  document.body.dataset.mode = mode;

  const gate = document.getElementById("gate");
  const tour = document.getElementById("tour");
  const app = document.querySelector(".app");

  if (mode === "enter") {
    tour.hidden = true;
    tour.setAttribute("aria-hidden", "true");
    app.hidden = true;
    gate.hidden = false;
    gate.classList.remove("is-leaving");
    gate.setAttribute("aria-hidden", "false");
  }

  if (mode === "tour") {
    app.hidden = true;
    if (previous === "enter" && !gate.hidden && !skipHash) {
      gate.classList.add("is-leaving");
      await wait(700);
    }
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
    tour.hidden = false;
    tour.setAttribute("aria-hidden", "false");
    tourApi?.begin();
  }

  if (mode === "atlas") {
    gate.hidden = true;
    tour.hidden = true;
    gate.setAttribute("aria-hidden", "true");
    tour.setAttribute("aria-hidden", "true");
    app.hidden = false;
    showAtlasView(name);
  }

  if (!skipHash) {
    window.location.hash = name === "enter" ? "" : name;
  }
}

function showAtlasView(name) {
  document.querySelectorAll(".view").forEach((view) => {
    const active = view.dataset.view === name;
    view.classList.toggle("is-active", active);
    view.setAttribute("aria-hidden", active ? "false" : "true");
  });
  document.querySelectorAll(".nav-btn").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "journey") {
    window.setTimeout(replayRoute, 200);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
