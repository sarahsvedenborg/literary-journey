import {
  WIDTH,
  HEIGHT,
  project,
  catmullRom,
  clusterOffsets,
  paintMap,
} from "./geo.js";
import { exhibitionStats, locationLabel } from "./data.js";

export function createTour(atlas, { onOpenBook, onExit, onEnterAtlas }) {
  const gate = document.getElementById("gate");
  const tour = document.getElementById("tour");
  const svg = document.getElementById("tour-map");
  const card = document.getElementById("tour-card");
  const progress = document.getElementById("tour-progress");

  fillGate(atlas);

  const stops = buildStops(atlas);
  const state = {
    index: -1,
    view: { x: 0, y: 0, w: WIDTH, h: HEIGHT },
    lengths: [],
    anim: 0,
    started: false,
  };

  let routePath = null;

  function mountMap() {
    svg.innerHTML = "";
    paintMap(svg, { prefix: "tour-" });
    routePath = svgEl(svg, "path", {
      class: "route-line tour-route",
      id: "tour-route",
      d: catmullRom(stops.map((stop) => stop.point)),
    });
    const markers = svgEl(svg, "g", { class: "tour-markers" });
    stops.forEach((stop) => {
      const g = svgEl(markers, "g", {
        class: "marker-hit tour-stop",
        transform: `translate(${stop.point.x}, ${stop.point.y})`,
        "data-book": stop.book.id,
        "data-state": "future",
      });
      const marker = svgEl(g, "g", { class: "marker" });
      svgEl(marker, "circle", {
        class: "tour-pulse",
        r: 14,
        fill: "none",
        stroke: "#8c3d3a",
        "stroke-width": 0.8,
        opacity: "0",
      });
      svgEl(marker, "circle", {
        r: 8,
        fill: "#f4ead2",
        stroke: "#8c3d3a",
        "stroke-width": 1.3,
      });
      const label = svgEl(marker, "text", {
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: "#8c3d3a",
        "font-size": 7.5,
        "font-family": "Cinzel, serif",
      });
      label.textContent = String(stop.book.order);
      g.addEventListener("click", () => {
        if (g.getAttribute("data-state") === "future") return;
        onOpenBook(stop.book.id);
      });
    });
    applyView(state.view);
    hideRoute(routePath);
    state.lengths = measureStops(routePath, stops);
  }

  async function begin() {
    if (!state.started) {
      mountMap();
      state.started = true;
    }
    state.index = -1;
    state.view = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
    applyView(state.view);
    hideRoute(routePath);
    progress.style.width = "0";
    document.querySelectorAll(".tour-stop").forEach((el) => {
      el.setAttribute("data-state", "future");
    });
    card.classList.remove("is-visible");
    await wait(420);
    await goTo(0, { fromWorld: true });
  }

  async function goTo(index, { fromWorld } = {}) {
    if (index < 0 || index >= stops.length) return;
    const token = ++state.anim;
    const previous = state.index;
    const stop = stops[index];
    const samePlace = previous >= 0 && sameLocation(stops[previous], stop);

    setMarkerStates(index);
    if (!samePlace) {
      card.classList.remove("is-visible");
      const dest = frameAround(stop.point, 260);
      if (fromWorld) {
        await animateView(state.view, dest, 1800, token);
      } else {
        await fly(state.view, dest, token);
      }
      if (token !== state.anim) return;
      await revealRouteTo(previous, index, token);
    }

    if (token !== state.anim) return;
    state.index = index;
    renderCard(stop, index);
    card.classList.add("is-visible");
    pulseCurrent(stop.book.id);
  }

  function renderCard(stop, index) {
    const book = stop.book;
    const place = locationLabel(book);
    const last = index === stops.length - 1;
    card.innerHTML = `
      <p class="tour-step">${String(index + 1).padStart(2, "0")} / ${String(stops.length).padStart(2, "0")}</p>
      <h2>${escapeHtml(book.title)}</h2>
      <p class="tour-author">${escapeHtml(book.author || "Author not recorded")}${book.publicationYear ? `, ${book.publicationYear}` : ""}</p>
      ${place ? `<p class="tour-place">${escapeHtml(place)}</p>` : ""}
      <div class="tour-actions">
        <button type="button" class="tour-text-btn" data-tour="back" ${index === 0 ? "disabled" : ""}>Previous</button>
        <button type="button" class="tour-text-btn" data-tour="open">Open volume</button>
        <button type="button" class="tour-continue" data-tour="${last ? "atlas" : "next"}">
          ${last ? "Enter the atlas" : "Continue"}
        </button>
      </div>
    `;
    progress.style.width = `${((index + 1) / stops.length) * 100}%`;
  }

  card.addEventListener("click", (event) => {
    const action = event.target.closest("[data-tour]")?.getAttribute("data-tour");
    if (!action) return;
    if (action === "back") goTo(state.index - 1);
    if (action === "next") goTo(state.index + 1);
    if (action === "open" && state.index >= 0) onOpenBook(stops[state.index].book.id);
    if (action === "atlas") onEnterAtlas();
  });

  document.getElementById("gate-enter")?.addEventListener("click", () => onExit("tour"));
  document.getElementById("tour-leave")?.addEventListener("click", () => onEnterAtlas());

  document.addEventListener("keydown", (event) => {
    if (document.body.dataset.mode !== "tour") return;
    if (!document.getElementById("folio").hidden) return;
    if (event.key === "ArrowRight" && state.index < stops.length - 1) goTo(state.index + 1);
    if (event.key === "ArrowLeft" && state.index > 0) goTo(state.index - 1);
  });

  function setMarkerStates(current) {
    document.querySelectorAll(".tour-stop").forEach((el, i) => {
      el.setAttribute("data-state", i < current ? "past" : i === current ? "current" : "future");
    });
  }

  function pulseCurrent(id) {
    document.querySelectorAll(".tour-stop").forEach((el) => {
      el.classList.toggle("is-hot", el.getAttribute("data-book") === id);
    });
  }

  async function fly(from, to, token) {
    const mid = wideFrame(from, to);
    await animateView(from, mid, 900, token);
    if (token !== state.anim) return;
    await animateView(state.view, to, 1100, token);
  }

  function animateView(from, to, duration, token) {
    return new Promise((resolve) => {
      const start = { ...from };
      const t0 = performance.now();
      const tick = (now) => {
        if (token !== state.anim) return resolve();
        const t = Math.min(1, (now - t0) / duration);
        const e = easeInOut(t);
        state.view = {
          x: start.x + (to.x - start.x) * e,
          y: start.y + (to.y - start.y) * e,
          w: start.w + (to.w - start.w) * e,
          h: start.h + (to.h - start.h) * e,
        };
        applyView(state.view);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  function applyView(view) {
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  }

  function revealRouteTo(previous, index, token) {
    const fromLength = previous < 0 ? 0 : state.lengths[previous];
    const toLength = state.lengths[index];
    return revealRoute(routePath, fromLength, toLength, () => token === state.anim);
  }

  return { begin, gate, tour };
}

function fillGate(atlas) {
  const stats = exhibitionStats(atlas);
  const works = document.getElementById("stat-works");
  const authors = document.getElementById("stat-authors");
  const years = document.getElementById("stat-years");
  if (works) works.textContent = String(stats.works);
  if (authors) authors.textContent = String(stats.authors);
  if (years) years.textContent = stats.yearLabel || "—";
}

function buildStops(atlas) {
  const located = atlas.books.filter((book) => book.coordinates);
  const groups = new Map();
  located.forEach((book) => {
    const key = `${book.coordinates.lat.toFixed(3)},${book.coordinates.lng.toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(book);
  });
  const positions = new Map();
  groups.forEach((books) => {
    const base = project(books[0].coordinates.lat, books[0].coordinates.lng);
    const offsets = clusterOffsets(books.length);
    books.forEach((book, index) => {
      positions.set(book.id, {
        x: base.x + offsets[index].dx,
        y: base.y + offsets[index].dy,
      });
    });
  });
  return located.map((book) => ({
    book,
    point: positions.get(book.id),
  }));
}

function sameLocation(a, b) {
  return (
    a.book.coordinates.lat === b.book.coordinates.lat &&
    a.book.coordinates.lng === b.book.coordinates.lng
  );
}

function frameAround(point, size) {
  const w = size;
  const h = size * (HEIGHT / WIDTH);
  return {
    x: point.x - w / 2,
    y: point.y - h / 2,
    w,
    h,
  };
}

function wideFrame(from, to) {
  const ax = from.x + from.w / 2;
  const ay = from.y + from.h / 2;
  const bx = to.x + to.w / 2;
  const by = to.y + to.h / 2;
  const pad = 90;
  const minX = Math.min(ax, bx) - pad;
  const maxX = Math.max(ax, bx) + pad;
  const minY = Math.min(ay, by) - pad;
  const maxY = Math.max(ay, by) + pad;
  let w = Math.max(maxX - minX, 380);
  let h = w * (HEIGHT / WIDTH);
  if (maxY - minY > h) {
    h = maxY - minY;
    w = h * (WIDTH / HEIGHT);
  }
  return {
    x: (minX + maxX) / 2 - w / 2,
    y: (minY + maxY) / 2 - h / 2,
    w,
    h,
  };
}

function hideRoute(path) {
  if (!path) return;
  try {
    const length = path.getTotalLength();
    path.style.transition = "none";
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  } catch {
    /* empty map */
  }
}

function measureStops(path, stops) {
  if (!path) return stops.map(() => 0);
  let total = 0;
  try {
    total = path.getTotalLength();
  } catch {
    return stops.map(() => 0);
  }
  return stops.map((stop) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= 500; i += 1) {
      const length = (total * i) / 500;
      const point = path.getPointAtLength(length);
      const dist =
        (point.x - stop.point.x) ** 2 + (point.y - stop.point.y) ** 2;
      if (dist < bestD) {
        bestD = dist;
        best = length;
      }
    }
    return best;
  });
}

function revealRoute(path, fromLength, toLength, stillCurrent) {
  return new Promise((resolve) => {
    if (!path) return resolve();
    let total = 0;
    try {
      total = path.getTotalLength();
    } catch {
      return resolve();
    }
    const start = total - fromLength;
    const end = total - toLength;
    const duration = Math.max(700, Math.min(1600, Math.abs(toLength - fromLength) * 4));
    path.style.transition = "none";
    path.style.strokeDashoffset = `${start}`;
    path.getBoundingClientRect();
    const t0 = performance.now();
    const tick = (now) => {
      if (stillCurrent && !stillCurrent()) return resolve();
      const t = Math.min(1, (now - t0) / duration);
      path.style.strokeDashoffset = `${start + (end - start) * easeInOut(t)}`;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (2 * (1 - t) * (1 - t));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function svgEl(parent, name, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  parent.appendChild(el);
  return el;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
