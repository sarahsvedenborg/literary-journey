export function renderWorlds(atlas, { onOpenBook }) {
  const root = document.getElementById("worlds-root");
  root.innerHTML = atlas.literaryWorlds
    .map((world) => {
      const books = world.books.map((id) => atlas.getBook(id)).filter(Boolean);
      return `
        <article class="world-room" data-color="${world.color}">
          <p class="world-kicker">${books.length} volume${books.length === 1 ? "" : "s"}</p>
          <h3>${escapeHtml(world.name)}</h3>
          <p class="desc">${escapeHtml(world.description)}</p>
          <div class="world-books">
            ${books
              .map(
                (book) => `
                  <button class="world-book" data-book="${book.id}" type="button">
                    <strong>${escapeHtml(book.title)}</strong>
                    <em>${escapeHtml(book.author || "Author not recorded")}${book.publicationYear ? `, ${book.publicationYear}` : ""}</em>
                  </button>`
              )
              .join("")}
          </div>
        </article>`;
    })
    .join("");

  root.querySelectorAll("[data-book]").forEach((el) => {
    el.addEventListener("click", () => onOpenBook(el.getAttribute("data-book")));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
