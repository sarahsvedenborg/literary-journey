import { loadAtlas } from "./data.js";
import { createPanel } from "./panel.js";
import { renderJourney, replayRoute } from "./journey.js";
import { renderTimeline } from "./timeline.js";
import { renderIdeas } from "./ideas.js";
import { renderWorlds } from "./worlds.js";

const VIEWS = ["journey", "timeline", "ideas", "worlds"];

init().catch((error) => {
  document.getElementById("lede").textContent = error.message;
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

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  window.addEventListener("hashchange", () => {
    const view = parseHash();
    if (view) showView(view, { skipHash: true });
  });

  const initial = parseHash() || "journey";
  showView(initial, { skipHash: true });
}

function parseHash() {
  const value = window.location.hash.replace("#", "");
  return VIEWS.includes(value) ? value : null;
}

function showView(name, { skipHash } = {}) {
  if (!VIEWS.includes(name)) return;
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
  if (!skipHash) window.location.hash = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "journey") {
    window.setTimeout(replayRoute, 200);
  }
}
