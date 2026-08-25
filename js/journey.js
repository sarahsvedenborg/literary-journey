import {
  WIDTH,
  HEIGHT,
  LAND,
  ringPath,
  graticulePath,
  project,
  catmullRom,
  clusterOffsets,
} from "./geo.js";
import { locationLabel } from "./data.js";

export function renderJourney(atlas, { onOpenBook }) {
  const svg = document.getElementById("atlas-map");
  const itinerary = document.getElementById("itinerary");
  const ns = "http://www.w3.org/2000/svg";

  const located = atlas.books.filter((book) => book.coordinates);
  const unlocated = atlas.books.filter((book) => !book.coordinates);

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

  const routeBooks = [];
  located.forEach((book) => {
    const prev = routeBooks[routeBooks.length - 1];
    const samePlace =
      prev &&
      prev.coordinates.lat === book.coordinates.lat &&
      prev.coordinates.lng === book.coordinates.lng;
    if (!samePlace) routeBooks.push(book);
  });
  const routePoints = routeBooks.map((book) => {
    const base = project(book.coordinates.lat, book.coordinates.lng);
    return { x: base.x, y: base.y };
  });

  svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);
  svg.innerHTML = "";

  const defs = svgEl(svg, "defs", {});
  defs.innerHTML = `
    <filter id="paper-ink" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0.6"/>
    </filter>
    <radialGradient id="ocean-wash" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#efe3c6"/>
      <stop offset="100%" stop-color="#d9c9a3"/>
    </radialGradient>
  `;

  svgEl(svg, "rect", {
    class: "ocean",
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    fill: "url(#ocean-wash)",
  });

  svgEl(svg, "path", {
    class: "graticule",
    d: graticulePath(),
  });

  const landGroup = svgEl(svg, "g", { filter: "url(#paper-ink)" });
  LAND.forEach((ring) => {
    svgEl(landGroup, "path", { class: "land", d: ringPath(ring) });
  });

  const route = svgEl(svg, "path", {
    class: "route-line",
    id: "reading-route",
    d: catmullRom(routePoints),
  });

  const markers = svgEl(svg, "g", { class: "markers" });
  located.forEach((book) => {
    const point = positions.get(book.id);
    const g = svgEl(markers, "g", {
      class: "marker-hit",
      transform: `translate(${point.x}, ${point.y})`,
      "data-book": book.id,
      style: "cursor:pointer",
    });
    const marker = svgEl(g, "g", { class: "marker" });
    svgEl(marker, "circle", {
      r: 9,
      fill: "#f4ead2",
      stroke: "#8c3d3a",
      "stroke-width": 1.2,
    });
    const label = svgEl(marker, "text", {
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: "#8c3d3a",
      "font-size": 8,
      "font-family": "Cinzel, serif",
    });
    label.textContent = String(book.order);
    const title = document.createElementNS(ns, "title");
    title.textContent = `${book.order}. ${book.title}${book.author ? ` — ${book.author}` : ""}`;
    g.appendChild(title);
    g.addEventListener("mouseenter", () => highlight(book.id, true));
    g.addEventListener("mouseleave", () => highlight(book.id, false));
    g.addEventListener("click", () => onOpenBook(book.id));
  });

  drawCartouche(svg);
  drawCompass(svg);

  itinerary.innerHTML = `
    <h3>Itinerary</h3>
    ${atlas.books
      .map((book) => {
        const place = locationLabel(book) || "No geographical marker";
        return `
          <button class="itinerary-item${book.coordinates ? "" : " is-dim"}" data-book="${book.id}" type="button">
            <span class="ord">${String(book.order).padStart(2, "0")}</span>
            <span>
              <strong>${escapeHtml(book.title)}</strong>
              <span>${escapeHtml(place)}</span>
            </span>
          </button>`;
      })
      .join("")}
  `;

  itinerary.querySelectorAll("[data-book]").forEach((item) => {
    const id = item.getAttribute("data-book");
    item.addEventListener("mouseenter", () => highlight(id, true));
    item.addEventListener("mouseleave", () => highlight(id, false));
    item.addEventListener("click", () => onOpenBook(id));
  });

  enablePanZoom(svg);
  requestAnimationFrame(() => animateRoute(route));

  const caption = document.querySelector(".map-caption span");
  if (caption && unlocated.length) {
    caption.textContent = `The route follows reading order. ${unlocated.length} volume has no geographical marker.`;
  }

  function highlight(id, on) {
    itinerary.querySelectorAll("[data-book]").forEach((el) => {
      el.classList.toggle("is-hot", on && el.getAttribute("data-book") === id);
    });
    markers.querySelectorAll("[data-book]").forEach((el) => {
      const marker = el.querySelector(".marker");
      marker?.classList.toggle("is-hot", on && el.getAttribute("data-book") === id);
    });
  }
}

export function replayRoute() {
  const path = document.getElementById("reading-route");
  if (path) animateRoute(path);
}

function animateRoute(path) {
  let length = 0;
  try {
    length = path.getTotalLength();
  } catch {
    return;
  }
  path.style.transition = "none";
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  path.getBoundingClientRect();
  requestAnimationFrame(() => {
    path.style.transition = "stroke-dashoffset 3.2s ease";
    path.style.strokeDashoffset = "0";
  });
}

function drawCartouche(svg) {
  const g = svgEl(svg, "g", { transform: "translate(28, 28)" });
  svgEl(g, "rect", {
    x: 0,
    y: 0,
    width: 210,
    height: 58,
    fill: "#f4ead2",
    stroke: "#b08d4a",
    "stroke-width": 0.8,
    opacity: 0.92,
  });
  const t1 = svgEl(g, "text", {
    x: 105,
    y: 22,
    "text-anchor": "middle",
    fill: "#8c3d3a",
    "font-size": 8,
    "letter-spacing": "2.4",
    "font-family": "Cinzel, serif",
  });
  t1.textContent = "THE LITERARY JOURNEY";
  const t2 = svgEl(g, "text", {
    x: 105,
    y: 42,
    "text-anchor": "middle",
    fill: "#5a4e3c",
    "font-size": 11,
    "font-family": "Cormorant Garamond, serif",
    "font-style": "italic",
  });
  t2.textContent = "A plate of reading, 2026";
}

function drawCompass(svg) {
  const g = svgEl(svg, "g", { transform: `translate(70, ${HEIGHT - 70})`, opacity: "0.75" });
  svgEl(g, "circle", { r: 22, fill: "none", stroke: "#b08d4a", "stroke-width": 0.8 });
  svgEl(g, "circle", { r: 4, fill: "#8c3d3a" });
  svgEl(g, "polygon", { points: "0,-20 4,0 -4,0", fill: "#8c3d3a" });
  svgEl(g, "polygon", { points: "0,20 4,0 -4,0", fill: "#6d6a3d" });
  const n = svgEl(g, "text", {
    y: -26,
    "text-anchor": "middle",
    fill: "#8c3d3a",
    "font-size": 8,
    "font-family": "Cinzel, serif",
  });
  n.textContent = "N";
}

function enablePanZoom(svg) {
  const base = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  let view = { ...base };
  let drag = null;

  const apply = () => {
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  };

  const zoomAt = (cx, cy, factor) => {
    const nextW = Math.min(WIDTH, Math.max(220, view.w * factor));
    const nextH = nextW * (HEIGHT / WIDTH);
    const px = view.x + (cx / svg.clientWidth) * view.w;
    const py = view.y + (cy / svg.clientHeight) * view.h;
    view = {
      w: nextW,
      h: nextH,
      x: px - (cx / svg.clientWidth) * nextW,
      y: py - (cy / svg.clientHeight) * nextH,
    };
    apply();
  };

  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomAt(event.offsetX, event.offsetY, event.deltaY > 0 ? 1.08 : 0.92);
    },
    { passive: false }
  );

  svg.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".marker-hit")) return;
    drag = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = ((event.clientX - drag.x) / svg.clientWidth) * view.w;
    const dy = ((event.clientY - drag.y) / svg.clientHeight) * view.h;
    view.x = drag.vx - dx;
    view.y = drag.vy - dy;
    apply();
  });
  svg.addEventListener("pointerup", () => {
    drag = null;
  });

  document.getElementById("zoom-in")?.addEventListener("click", () => {
    zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 0.85);
  });
  document.getElementById("zoom-out")?.addEventListener("click", () => {
    zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1.15);
  });
  document.getElementById("zoom-reset")?.addEventListener("click", () => {
    view = { ...base };
    apply();
  });
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
