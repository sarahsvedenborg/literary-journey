export function renderIdeas(atlas, { onOpenBook }) {
  const svg = document.getElementById("ideas-map");
  const index = document.getElementById("theme-index");
  const width = 900;
  const height = 560;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const themeNodes = atlas.themes.map((theme, i) => {
    const angle = (Math.PI * 2 * i) / atlas.themes.length - Math.PI / 2;
    return {
      id: theme.id,
      kind: "theme",
      name: theme.name,
      description: theme.description,
      books: theme.books,
      x: width / 2 + Math.cos(angle) * 210,
      y: height / 2 + Math.sin(angle) * 185,
    };
  });

  const bookIds = [...new Set(atlas.themes.flatMap((theme) => theme.books))];
  const bookNodes = bookIds.map((id, i) => {
    const book = atlas.getBook(id);
    const angle = (Math.PI * 2 * i) / bookIds.length;
    return {
      id,
      kind: "book",
      name: book.title,
      author: book.author,
      x: width / 2 + Math.cos(angle) * 70,
      y: height / 2 + Math.sin(angle) * 58,
    };
  });

  const links = [];
  themeNodes.forEach((theme) => {
    theme.books.forEach((bookId) => {
      const book = bookNodes.find((node) => node.id === bookId);
      if (book) links.push({ theme, book });
    });
  });

  settle(themeNodes, bookNodes, links, width, height);

  index.innerHTML = atlas.themes
    .map(
      (theme) => `
        <button class="theme-btn" data-theme="${theme.id}" type="button">
          <strong>${escapeHtml(theme.name)}</strong>
          <span>${theme.books.length} volumes</span>
        </button>`
    )
    .join("");

  let selected = null;

  function draw() {
    const activeBooks = selected
      ? new Set(atlas.themes.find((theme) => theme.id === selected)?.books || [])
      : null;

    svg.innerHTML = `
      <rect width="${width}" height="${height}" fill="#efe3c6"></rect>
      <g class="links">
        ${links
          .map((link) => {
            const hot = !selected || link.theme.id === selected;
            return `<line x1="${link.theme.x}" y1="${link.theme.y}" x2="${link.book.x}" y2="${link.book.y}"
              stroke="${hot ? "#8c3d3a" : "#b9a888"}" stroke-opacity="${hot ? 0.45 : 0.08}" stroke-width="${hot ? 1.2 : 0.7}"/>`;
          })
          .join("")}
      </g>
      <g class="books">
        ${bookNodes
          .map((node) => {
            const hot = !selected || activeBooks.has(node.id);
            return `<g class="book-node" data-book="${node.id}" transform="translate(${node.x},${node.y})" style="cursor:pointer;opacity:${hot ? 1 : 0.18}">
              <circle r="${hot && selected ? 8 : 5.5}" fill="#f4ead2" stroke="${hot && selected ? "#8c3d3a" : "#6d6a3d"}" stroke-width="1.1"/>
              <text x="10" y="4" font-size="11" font-family="EB Garamond, serif" fill="#2b2418">${escapeHtml(node.name)}</text>
            </g>`;
          })
          .join("")}
      </g>
      <g class="themes">
        ${themeNodes
          .map((node) => {
            const hot = !selected || node.id === selected;
            return `<g class="theme-node" data-theme="${node.id}" transform="translate(${node.x},${node.y})" style="cursor:pointer;opacity:${hot ? 1 : 0.28}">
              <circle r="16" fill="${node.id === selected ? "#8c3d3a" : "#f4ead2"}" stroke="#b08d4a" stroke-width="1.3"/>
              <text text-anchor="middle" y="32" font-size="12" font-family="Cormorant Garamond, serif" fill="#2b2418">${escapeHtml(node.name)}</text>
            </g>`;
          })
          .join("")}
      </g>
    `;

    svg.querySelectorAll(".theme-node").forEach((el) => {
      el.addEventListener("click", () => selectTheme(el.getAttribute("data-theme")));
    });
    svg.querySelectorAll(".book-node").forEach((el) => {
      el.addEventListener("click", () => onOpenBook(el.getAttribute("data-book")));
    });
  }

  function selectTheme(id) {
    selected = selected === id ? null : id;
    index.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-theme") === selected);
    });
    draw();
  }

  index.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectTheme(btn.getAttribute("data-theme")));
  });

  draw();
  enablePanZoom(svg, width, height);
}

function settle(themes, books, links, width, height) {
  for (let i = 0; i < 180; i += 1) {
    books.forEach((a, index) => {
      books.forEach((b, other) => {
        if (index === other) return;
        const dx = a.x - b.x || 0.1;
        const dy = a.y - b.y || 0.1;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 46) {
          const f = ((46 - dist) / dist) * 0.12;
          a.x += dx * f;
          a.y += dy * f;
        }
      });
      let fx = 0;
      let fy = 0;
      links
        .filter((link) => link.book === a)
        .forEach((link) => {
          fx += (link.theme.x - a.x) * 0.012;
          fy += (link.theme.y - a.y) * 0.012;
        });
      a.x += fx + (width / 2 - a.x) * 0.01;
      a.y += fy + (height / 2 - a.y) * 0.01;
      a.x = Math.max(80, Math.min(width - 140, a.x));
      a.y = Math.max(30, Math.min(height - 30, a.y));
    });
  }
}

function enablePanZoom(svg, width, height) {
  let view = { x: 0, y: 0, w: width, h: height };
  let drag = null;
  const apply = () => svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);

  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.08 : 0.92;
      const nextW = Math.min(width, Math.max(280, view.w * factor));
      const nextH = nextW * (height / width);
      const px = view.x + (event.offsetX / svg.clientWidth) * view.w;
      const py = view.y + (event.offsetY / svg.clientHeight) * view.h;
      view = {
        w: nextW,
        h: nextH,
        x: px - (event.offsetX / svg.clientWidth) * nextW,
        y: py - (event.offsetY / svg.clientHeight) * nextH,
      };
      apply();
    },
    { passive: false }
  );

  svg.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".book-node, .theme-node")) return;
    drag = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", (event) => {
    if (!drag) return;
    view.x = drag.vx - ((event.clientX - drag.x) / svg.clientWidth) * view.w;
    view.y = drag.vy - ((event.clientY - drag.y) / svg.clientHeight) * view.h;
    apply();
  });
  svg.addEventListener("pointerup", () => {
    drag = null;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
