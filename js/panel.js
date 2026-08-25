import { formatDate, locationLabel, typeLabel } from "./data.js";

export function createPanel(atlas, { onNavigate }) {
  const folio = document.getElementById("folio");
  const inner = document.getElementById("folio-inner");
  const veil = document.getElementById("veil");
  const closeBtn = document.getElementById("folio-close");
  let lastFocus = null;

  function close() {
    folio.classList.remove("is-open");
    veil.classList.remove("is-open");
    folio.hidden = true;
    veil.hidden = true;
    folio.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }

  function open(bookId) {
    const book = atlas.getBook(bookId);
    if (!book) return;
    lastFocus = document.activeElement;
    inner.innerHTML = renderBook(book, atlas);
    folio.hidden = false;
    veil.hidden = false;
    folio.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      folio.classList.add("is-open");
      veil.classList.add("is-open");
    });
    closeBtn.focus();
  }

  closeBtn.addEventListener("click", close);
  veil.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !folio.hidden) close();
  });

  inner.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-book]");
    if (!button) return;
    open(button.getAttribute("data-open-book"));
    onNavigate?.(button.getAttribute("data-open-book"));
  });

  return { open, close };
}

function renderBook(book, atlas) {
  const author = book.author || "Author not recorded";
  const original = book.originalTitle && book.originalTitle !== book.title
    ? `<p class="original-title">${escapeHtml(book.originalTitle)}</p>`
    : "";
  const location = locationLabel(book);
  const worlds = book.worlds
    .map((id) => atlas.worldsById.get(id)?.name)
    .filter(Boolean);
  const connections = (book.connections || [])
    .map((id) => atlas.getBook(id))
    .filter(Boolean);

  const rows = [
    ["Author", author],
    ["Year", book.publicationYear],
    ["Type", typeLabel(book.type)],
    ["Language", book.language],
    ["Movement", book.literaryMovement],
    ["Place", location],
    ["Reading", readingLine(book)],
  ].filter(([, value]) => value);

  return `
    <p class="folio-kicker">Volume ${String(book.order).padStart(2, "0")}</p>
    <h2 id="folio-title">${escapeHtml(book.title)}</h2>
    ${original}
    <div class="folio-meta">
      ${rows
        .map(
          ([label, value]) => `
            <div class="meta-row">
              <span class="meta-label">${label}</span>
              <span>${escapeHtml(String(value))}</span>
            </div>`
        )
        .join("")}
    </div>
    ${
      book.themes?.length
        ? `<p class="meta-label">Themes</p>
           <div class="chips">${book.themes
             .map((theme) => `<span class="chip">${escapeHtml(theme.replace(/-/g, " "))}</span>`)
             .join("")}</div>`
        : ""
    }
    ${
      worlds.length
        ? `<p class="meta-label" style="margin-top:16px">Worlds</p>
           <div class="chips">${worlds
             .map((name) => `<span class="chip">${escapeHtml(name)}</span>`)
             .join("")}</div>`
        : ""
    }
    ${
      connections.length
        ? `<p class="meta-label" style="margin-top:16px">Connected volumes</p>
           <ul class="connections">${connections
             .map(
               (item) => `<li><button type="button" data-open-book="${item.id}">${escapeHtml(item.title)}${item.author ? ` — ${escapeHtml(item.author)}` : ""}</button></li>`
             )
             .join("")}</ul>`
        : ""
    }
    ${book.readingDurationNote ? `<p class="note">${escapeHtml(book.readingDurationNote)}</p>` : ""}
    ${book.notes ? `<p class="note">${escapeHtml(book.notes)}</p>` : ""}
  `;
}

function readingLine(book) {
  const start = formatDate(book.reading?.start);
  const end = formatDate(book.reading?.end);
  const days = book.reading?.durationDays;
  if (start && end) {
    return `${start} – ${end}${days ? ` · ${days} days` : ""}`;
  }
  if (start && !end) {
    return `Begun ${start}; not yet dated as finished`;
  }
  if (days) {
    return `${days} days`;
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
